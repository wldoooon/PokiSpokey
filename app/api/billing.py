from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import select, desc
from .deps import get_current_user, get_session
from ..models.user import User
from ..models.subscription import Subscription
from ..models.invoice import Invoice
from ..core.logging import logger
from ..services.billing import (
    create_checkout_transaction,
    handle_webhook,
    cancel_subscription,
    reactivate_subscription,
    change_subscription_plan,
    verify_paddle_signature,
)

router = APIRouter(prefix="/billing", tags=["Billing"])


# ── Request schemas ──────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan: str            # "basic" | "pro" | "max"
    billing_period: str  # "monthly" | "yearly"


class CancelRequest(BaseModel):
    reason: str | None = None  # optional churn reason from UI


class UpgradeRequest(BaseModel):
    plan: str            # "basic" | "pro" | "max"
    billing_period: str  # "monthly" | "yearly"


# ── Checkout ─────────────────────────────────────────────────────────────────

@router.post("/checkout")
async def checkout(
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Creates a Paddle transaction for the given product.
    Returns the transaction_id — the frontend uses Paddle.js to open the
    checkout overlay. The actual plan upgrade happens when Paddle fires
    the subscription.activated webhook.
    """
    try:
        transaction_id = await create_checkout_transaction(
            user=current_user,
            plan=body.plan,
            billing_period=body.billing_period,
            db=db,
        )
        return {"transaction_id": transaction_id}
    except Exception as e:
        logger.error(f"[BILLING] Checkout creation failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to create checkout session.")



# ── Subscription ─────────────────────────────────────────────────────────────

@router.get("/subscription")
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    sub = result.scalars().first()
    if not sub:
        return {"subscription": None}
    return {
        "subscription": {
            "status": sub.status,
            "plan": sub.plan,
            "billing_period": sub.billing_period,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
            "cancel_at_period_end": sub.cancel_at_period_end,
            "canceled_at": sub.canceled_at.isoformat() if sub.canceled_at else None,
        }
    }


# ── Invoices ─────────────────────────────────────────────────────────────────

@router.get("/invoices")
async def get_invoices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.user_id == current_user.id)
        .order_by(desc(Invoice.created_at))
        .limit(24)
    )
    invoices = result.scalars().all()
    return {
        "invoices": [
            {
                "id": str(inv.id),
                "transaction_id": inv.paddle_transaction_id,
                "date": inv.created_at.isoformat(),
                "description": f"{inv.plan.capitalize()} · {inv.billing_period.capitalize()}",
                "amount": inv.amount,
                "currency": inv.currency,
                "status": inv.status,
                "invoice_url": inv.invoice_url,
            }
            for inv in invoices
        ]
    }


# ── Cancel Subscription ──────────────────────────────────────────────────────

@router.post("/cancel")
async def cancel(
    body: CancelRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    try:
        await cancel_subscription(user=current_user, db=db)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[BILLING] Cancel failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to cancel subscription.")


# ── Upgrade / Downgrade ───────────────────────────────────────────────────────

@router.post("/upgrade")
async def upgrade_plan(
    body: UpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Mutates the existing active subscription to a different plan/period.
    Fires subscription.plan_changed webhook which handles the tier update.
    Use this instead of /checkout when the user already has an active subscription.
    """
    try:
        await change_subscription_plan(
            user=current_user,
            db=db,
            plan=body.plan,
            billing_period=body.billing_period,
        )
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[BILLING] Upgrade failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to change subscription plan.")


# ── Payment Methods ───────────────────────────────────────────────────────────

@router.get("/payment-methods")
async def get_payment_methods(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    sub = result.scalars().first()
    if not sub or not sub.paddle_subscription_id:
        return {"payment_methods": []}
    try:
        import asyncio
        from ..core.paddle import paddle_client
        from paddle_billing.Resources.Transactions.Operations import ListTransactions

        txns_page = await asyncio.to_thread(
            paddle_client.get().transactions.list,
            ListTransactions(subscription_ids=[sub.paddle_subscription_id]),
        )
        for txn in txns_page:
            if not txn.payments:
                continue
            for payment in txn.payments:
                method = payment.method_details
                if method and method.type == "card" and method.card:
                    return {
                        "payment_methods": [{
                            "payment_method_id": None,
                            "card_holder_name": method.card.cardholder_name or "",
                            "card_network": (method.card.type.value if method.card.type else "").lower(),
                            "last4": method.card.last4,
                            "expiry_month": method.card.expiry_month,
                            "expiry_year": method.card.expiry_year,
                        }]
                    }
        return {"payment_methods": []}
    except Exception as e:
        logger.error(f"[BILLING] Failed to fetch payment methods for user {current_user.id}: {e}", exc_info=True)
        return {"payment_methods": []}


# ── Reactivate Subscription ──────────────────────────────────────────────────

@router.post("/reactivate")
async def reactivate(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    try:
        await reactivate_subscription(user=current_user, db=db)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[BILLING] Reactivate failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to reactivate subscription.")


# ── Webhook ──────────────────────────────────────────────────────────────────

@router.post("/webhooks/paddle", include_in_schema=False)
async def paddle_webhook(
    request: Request,
    db: AsyncSession = Depends(get_session),
    paddle_signature: str = Header(..., alias="Paddle-Signature"),
):
    raw_body = await request.body()

    if not verify_paddle_signature(raw_body, paddle_signature):
        logger.warning("[WEBHOOK] Paddle signature verification failed")
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")

    import json
    payload_dict = json.loads(raw_body)
    event_type = payload_dict.get("event_type", "unknown")
    event_id = payload_dict.get("notification_id", "unknown")
    data = payload_dict.get("data", {})

    try:
        await handle_webhook(
            event_id=event_id,
            event_type=event_type,
            data=data,
            raw_body=raw_body.decode("utf-8"),
            db=db,
        )
    except Exception as e:
        logger.error(f"[WEBHOOK] Handler error for {event_type}: {e}")

    return JSONResponse({"received": True})
