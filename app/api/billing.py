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
from ..core.dodo import dodo_client
from ..services.billing import (
    create_checkout_url,
    handle_webhook,
    cancel_subscription,
    reactivate_subscription,
    change_subscription_plan,
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
):
    """
    Creates a Dodo checkout session for the given product.
    Returns the URL to redirect the user to — payment happens on Dodo's page.

    The actual plan upgrade does NOT happen here.
    It happens when Dodo fires the subscription.active webhook.
    """
    try:
        url = await create_checkout_url(
            user=current_user,
            plan=body.plan,
            billing_period=body.billing_period,
        )
        return {"checkout_url": url}
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
                "dodo_payment_id": inv.dodo_payment_id,
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
):
    if not current_user.dodo_customer_id:
        return {"payment_methods": []}
    try:
        resp = await dodo_client.get().customers.retrieve_payment_methods(
            current_user.dodo_customer_id
        )
        methods = []
        for item in (resp.items or []):
            if item.payment_method != "card" or not item.card:
                continue
            methods.append({
                "payment_method_id": item.payment_method_id,
                "card_holder_name": item.card.card_holder_name,
                "card_network": (item.card.card_network or "").lower(),
                "card_type": (item.card.card_type or "").lower(),
                "expiry_month": item.card.expiry_month,
                "expiry_year": item.card.expiry_year,
                "last4": item.card.last4_digits,
                "recurring_enabled": item.recurring_enabled,
                "last_used_at": item.last_used_at.isoformat() if item.last_used_at else None,
            })
        return {"payment_methods": methods}
    except Exception as e:
        logger.error(f"[BILLING] Failed to fetch payment methods for user {current_user.id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch payment methods.")


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

@router.post("/webhooks/dodo", include_in_schema=False)
async def dodo_webhook(
    request: Request,
    db: AsyncSession = Depends(get_session),
    webhook_id: str = Header(..., alias="webhook-id"),
    webhook_timestamp: str = Header(..., alias="webhook-timestamp"),
    webhook_signature: str = Header(..., alias="webhook-signature"),
):
    raw_body = await request.body()

    try:
        dodo_client.get().webhooks.unwrap(
            raw_body,
            headers={
                "webhook-id": webhook_id,
                "webhook-signature": webhook_signature,
                "webhook-timestamp": webhook_timestamp,
            },
        )
    except Exception as e:
        logger.warning(f"[WEBHOOK] Signature verification failed — id={webhook_id}: {e}")
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")

    import json
    payload_dict = json.loads(raw_body)
    event_type = payload_dict.get("type", "unknown")
    data = payload_dict.get("data", {})

    try:
        await handle_webhook(
            event_id=webhook_id,
            event_type=event_type,
            data=data,
            raw_body=raw_body.decode("utf-8"),
            db=db,
        )
    except Exception as e:
        logger.error(f"[WEBHOOK] Handler error for {event_type}: {e}")

    return JSONResponse({"received": True})
