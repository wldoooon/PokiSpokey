import asyncio
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import select, update

from paddle_billing.Notifications import Secret, Verifier
from paddle_billing.Entities.Shared import CustomData
from paddle_billing.Entities.Subscriptions import SubscriptionEffectiveFrom, SubscriptionProrationBillingMode
from paddle_billing.Resources.Transactions.Operations import CreateTransaction
from paddle_billing.Resources.Transactions.Operations.Create import TransactionCreateItem
from paddle_billing.Resources.Customers.Operations import CreateCustomer
from paddle_billing.Resources.Subscriptions.Operations import CancelSubscription, UpdateSubscription
from paddle_billing.Resources.Subscriptions.Operations.Update import SubscriptionUpdateItem

from ..core.config import get_settings
from ..core.logging import logger
from ..core.paddle import paddle_client
from ..models.user import User, UserTier
from ..models.subscription import Subscription, SubscriptionStatus
from ..models.invoice import Invoice, PaymentStatus
from ..models.webhook_event import WebhookEvent
from .usage_service import reset_ai_credits, reset_search_limit

settings = get_settings()


# ── Price ID → Plan maps ───────────────────────────────────────────────────────

def _build_maps() -> tuple[dict, dict]:
    s = settings
    price_map = {
        s.PRODUCT_BASIC_MONTHLY: ("basic", "monthly"),
        s.PRODUCT_BASIC_YEARLY:  ("basic", "yearly"),
        s.PRODUCT_PRO_MONTHLY:   ("pro",   "monthly"),
        s.PRODUCT_PRO_YEARLY:    ("pro",   "yearly"),
        s.PRODUCT_MAX_MONTHLY:   ("max",   "monthly"),
        s.PRODUCT_MAX_YEARLY:    ("max",   "yearly"),
    }
    return price_map, {v: k for k, v in price_map.items()}

PRICE_MAP, PLAN_TO_PRICE = _build_maps()
PLAN_TO_TIER = {"basic": UserTier.BASIC, "pro": UserTier.PRO, "max": UserTier.MAX}


# ── Webhook signature verification ────────────────────────────────────────────

def verify_paddle_signature(raw_body: bytes, signature_header: str) -> bool:
    """Delegates to the official Paddle SDK Verifier."""
    class _Req:
        body = raw_body
        headers = {"Paddle-Signature": signature_header}

    try:
        return bool(Verifier().verify(_Req(), Secret(settings.WEBHOOK_SECRET)))
    except Exception:
        return False


# ── Checkout ──────────────────────────────────────────────────────────────────

async def create_checkout_transaction(user: User, plan: str, billing_period: str, db: AsyncSession | None = None) -> str:
    """
    Creates a Paddle transaction and returns its ID.
    Frontend uses this ID to open Paddle.Checkout.open({ transactionId }).
    """
    price_id = PLAN_TO_PRICE.get((plan.lower(), billing_period.lower()))
    if not price_id:
        raise ValueError(f"Unknown plan/period: {plan}/{billing_period}")

    customer_id = user.paddle_customer_id

    # Create a Paddle customer if we don't have one yet, so the receipt email goes to the user
    if not customer_id:
        paddle_customer = await asyncio.to_thread(
            paddle_client.get().customers.create,
            CreateCustomer(email=user.email, name=user.full_name or None),
        )
        customer_id = paddle_customer.id
        if db:
            await db.execute(
                update(User).where(User.id == user.id).values(paddle_customer_id=customer_id)
            )
            await db.commit()
        logger.info(f"[BILLING] Created Paddle customer {customer_id} for user {user.id}")

    def _create():
        op = CreateTransaction(
            items=[TransactionCreateItem(price_id=price_id, quantity=1)],
            custom_data=CustomData({"user_id": str(user.id)}),
            customer_id=customer_id,
        )
        return paddle_client.get().transactions.create(op)

    transaction = await asyncio.to_thread(_create)
    if not transaction or not transaction.id:
        raise ValueError("Paddle returned no transaction ID")
    return transaction.id


# ── Webhook dispatcher ────────────────────────────────────────────────────────

async def handle_webhook(
    event_id: str,
    event_type: str,
    data: dict,
    raw_body: str,
    db: AsyncSession,
) -> None:
    existing = await db.execute(
        select(WebhookEvent).where(WebhookEvent.paddle_event_id == event_id)
    )
    if existing.scalars().first():
        logger.info(f"[WEBHOOK] Duplicate skipped: {event_id}")
        return

    ev = WebhookEvent(
        paddle_event_id=event_id,
        event_type=event_type,
        payload=raw_body,
        processed=False,
    )
    db.add(ev)
    await db.flush()

    try:
        logger.info(f"[WEBHOOK] Processing {event_type} id={event_id}")
        handler = _HANDLERS.get(event_type)
        if handler:
            await handler(data, db, ev)
        else:
            logger.info(f"[WEBHOOK] Unhandled event type: {event_type}")

        ev.processed = True
        db.add(ev)
        await db.commit()

    except Exception as e:
        await db.rollback()
        ev.processing_error = str(e)
        db.add(ev)
        try:
            await db.commit()
        except Exception:
            logger.error(f"[WEBHOOK] Could not persist error for event {event_id}")
        logger.error(f"[WEBHOOK] Handler failed for {event_type}: {e}")
        raise


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_dt(value: str | None) -> Optional[datetime]:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


async def _get_user(data: dict, db: AsyncSession) -> Optional[User]:
    """Priority: custom_data.user_id → paddle_customer_id → email"""
    custom_data = data.get("custom_data") or {}
    if uid_str := custom_data.get("user_id"):
        try:
            uid = uuid.UUID(str(uid_str))
            if user := await db.get(User, uid):
                return user
        except (ValueError, AttributeError):
            pass

    if cid := data.get("customer_id"):
        result = await db.execute(select(User).where(User.paddle_customer_id == cid))
        if user := result.scalars().first():
            return user

    return None


async def _get_sub(paddle_sub_id: str, db: AsyncSession, retries: int = 3, delay: float = 1.0) -> Optional[Subscription]:
    for attempt in range(retries):
        result = await db.execute(
            select(Subscription).where(Subscription.paddle_subscription_id == paddle_sub_id)
        )
        sub = result.scalars().first()
        if sub:
            await db.refresh(sub)
            return sub
        if attempt < retries - 1:
            await asyncio.sleep(delay)
    return None


async def _patch_sub(sub: Subscription, db: AsyncSession, **values) -> None:
    await db.execute(update(Subscription).where(Subscription.id == sub.id).values(**values))
    await db.refresh(sub)


def _price_id_from_data(data: dict) -> str:
    items = data.get("items") or []
    if items:
        return (items[0].get("price") or {}).get("id", "")
    return ""


# ── Subscription handlers ─────────────────────────────────────────────────────

async def _on_sub_active(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    user = await _get_user(data, db)
    if not user:
        raise ValueError(f"User not found for subscription.activated: {data}")

    price_id = _price_id_from_data(data)
    mapping = PRICE_MAP.get(price_id)
    if not mapping:
        raise ValueError(f"Unknown price_id '{price_id}' — add to PRICE_MAP or .env")

    plan, billing_period = mapping
    paddle_cus_id = data.get("customer_id", "")
    paddle_sub_id = data.get("id", "")
    period_start  = datetime.now(timezone.utc)
    period_end    = _parse_dt(data.get("next_billed_at"))

    if not user.paddle_customer_id:
        user.paddle_customer_id = paddle_cus_id
    user.tier = PLAN_TO_TIER[plan]
    db.add(user)

    result = await db.execute(select(Subscription).where(Subscription.user_id == user.id))
    existing = result.scalars().first()

    if existing:
        await _patch_sub(existing, db,
            paddle_subscription_id=paddle_sub_id,
            paddle_customer_id=paddle_cus_id,
            paddle_price_id=price_id,
            plan=plan,
            billing_period=billing_period,
            status=SubscriptionStatus.ACTIVE,
            cancel_at_period_end=False,
            current_period_start=period_start,
            current_period_end=period_end,
            started_at=_parse_dt(data.get("created_at")),
        )
        sub = existing
    else:
        sub = Subscription(
            user_id=user.id,
            paddle_subscription_id=paddle_sub_id,
            paddle_customer_id=paddle_cus_id,
            paddle_price_id=price_id,
            plan=plan,
            billing_period=billing_period,
            status=SubscriptionStatus.ACTIVE,
            cancel_at_period_end=False,
            current_period_start=period_start,
            current_period_end=period_end,
            started_at=_parse_dt(data.get("created_at")),
        )
        db.add(sub)

    await reset_ai_credits(db, user, PLAN_TO_TIER[plan])
    await reset_search_limit(db, user, PLAN_TO_TIER[plan])
    await db.flush()
    ev.user_id = user.id
    ev.subscription_id = sub.id
    ev.paddle_subscription_id = sub.paddle_subscription_id
    logger.success(f"[WEBHOOK] {user.email} activated {plan} ({billing_period})")



async def _on_sub_updated(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    """
    Handles all subscription.updated cases:
    1. Cancellation scheduled  → scheduled_change.action == "cancel"
    2. Plan changed            → items[0].price.id != current paddle_price_id
    3. Recovery from past_due  → paddle status == "active", our status != ACTIVE
    4. Renewal                 → active, same price, next_billed_at changed
    5. Cancellation reversed   → fallthrough (reactivated before period end)
    """
    sub = await _get_sub(data.get("id", ""), db)
    if not sub:
        logger.info(f"[WEBHOOK] subscription.updated — sub not found, skipping: {data.get('id')}")
        return

    scheduled_change = data.get("scheduled_change")
    new_price_id = _price_id_from_data(data)
    paddle_status = data.get("status", "")
    next_billed_at = _parse_dt(data.get("next_billed_at"))

    if scheduled_change and scheduled_change.get("action") == "cancel":
        # Case 1: user cancelled — will lose access at period end
        await _patch_sub(sub, db, cancel_at_period_end=True)
        logger.info(f"[WEBHOOK] Subscription {sub.id} scheduled for cancellation")

    elif new_price_id and new_price_id != sub.paddle_price_id:
        # Case 2: plan change (upgrade or downgrade)
        mapping = PRICE_MAP.get(new_price_id)
        if not mapping:
            logger.warning(f"[WEBHOOK] Unknown price_id '{new_price_id}' on plan change — keeping existing")
        else:
            plan, billing_period = mapping
            new_tier = PLAN_TO_TIER.get(plan, UserTier.FREE)
            user = await db.get(User, sub.user_id)
            if user:
                user.tier = new_tier
                db.add(user)
                await reset_ai_credits(db, user, new_tier)
                await reset_search_limit(db, user, new_tier)
            await _patch_sub(sub, db,
                plan=plan,
                billing_period=billing_period,
                paddle_price_id=new_price_id,
                status=SubscriptionStatus.ACTIVE,
                current_period_start=datetime.now(timezone.utc),
                current_period_end=next_billed_at,
            )
            logger.info(f"[WEBHOOK] Subscription {sub.id} plan changed to {plan} ({billing_period})")

    elif paddle_status == "active" and sub.status != SubscriptionStatus.ACTIVE:
        # Case 3: recovered from past_due / on_hold — restore access
        await _patch_sub(sub, db,
            status=SubscriptionStatus.ACTIVE,
            cancel_at_period_end=False,
            current_period_end=next_billed_at or sub.current_period_end,
        )
        logger.info(f"[WEBHOOK] Subscription {sub.id} recovered — status restored to active")

    elif paddle_status == "active" and next_billed_at and next_billed_at != sub.current_period_end:
        # Case 4: renewal — update period only (credits reset in transaction.completed)
        await _patch_sub(sub, db,
            status=SubscriptionStatus.ACTIVE,
            cancel_at_period_end=False,
            current_period_end=next_billed_at,
        )
        logger.info(f"[WEBHOOK] Subscription {sub.id} period updated to {next_billed_at}")

    else:
        # Case 5: cancellation reversed (reactivated before period end)
        await _patch_sub(sub, db, cancel_at_period_end=False)
        logger.info(f"[WEBHOOK] Subscription {sub.id} reactivated — cancellation cleared")

    ev.subscription_id = sub.id
    ev.user_id = sub.user_id


async def _on_sub_cancelled(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    sub = await _get_sub(data.get("id", ""), db)
    if not sub:
        raise ValueError(f"Subscription not found: {data.get('id')}")
    user = await db.get(User, sub.user_id)
    if not user:
        raise ValueError(f"User {sub.user_id} not found during cancellation")
    user.tier = UserTier.FREE
    db.add(user)
    await _patch_sub(sub, db,
        status=SubscriptionStatus.CANCELLED,
        cancel_at_period_end=False,
        canceled_at=_parse_dt(data.get("canceled_at")) or datetime.now(timezone.utc),
    )
    await reset_ai_credits(db, user, UserTier.FREE)
    await reset_search_limit(db, user, UserTier.FREE)
    ev.subscription_id = sub.id
    ev.user_id = sub.user_id
    logger.info(f"[WEBHOOK] {user.email} downgraded to free — subscription canceled")


async def _on_sub_past_due(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    """Payment failed on renewal — keep access, mark on_hold for banner display."""
    sub = await _get_sub(data.get("id", ""), db)
    if not sub:
        raise ValueError(f"Subscription not found: {data.get('id')}")
    await _patch_sub(sub, db, status=SubscriptionStatus.ON_HOLD)
    ev.subscription_id = sub.id
    ev.user_id = sub.user_id
    logger.warning(f"[WEBHOOK] Subscription {sub.id} past_due — payment failed, dunning started")


async def _on_sub_paused(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    """Subscription manually paused or dunning exhausted — remove access."""
    sub = await _get_sub(data.get("id", ""), db)
    if not sub:
        raise ValueError(f"Subscription not found: {data.get('id')}")
    await _patch_sub(sub, db, status=SubscriptionStatus.ON_HOLD)
    ev.subscription_id = sub.id
    ev.user_id = sub.user_id
    logger.warning(f"[WEBHOOK] Subscription {sub.id} paused")


async def _on_sub_resumed(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    """Subscription manually resumed — restore access."""
    sub = await _get_sub(data.get("id", ""), db)
    if not sub:
        raise ValueError(f"Subscription not found: {data.get('id')}")
    await _patch_sub(sub, db,
        status=SubscriptionStatus.ACTIVE,
        current_period_end=_parse_dt(data.get("next_billed_at")) or sub.current_period_end,
    )
    ev.subscription_id = sub.id
    ev.user_id = sub.user_id
    logger.info(f"[WEBHOOK] Subscription {sub.id} resumed")


# ── Transaction / payment handlers ────────────────────────────────────────────

async def _on_transaction_completed(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    txn_id = data.get("id", "")
    origin = data.get("origin", "")

    # Resolve user and subscription first — needed for both credit reset and invoice
    user = await _get_user(data, db)
    if user and not user.paddle_customer_id and data.get("customer_id"):
        user.paddle_customer_id = data["customer_id"]
        db.add(user)

    sub_id = data.get("subscription_id", "")
    sub = await _get_sub(sub_id, db) if sub_id else None
    if not user and sub:
        user = await db.get(User, sub.user_id)

    if not user:
        logger.warning(f"[WEBHOOK] No user found for transaction {txn_id}")
        return

    # Renewal: reset credits on every recurring payment — runs even if invoice already exists
    if origin == "subscription_recurring" and sub:
        billing_period_end = _parse_dt((data.get("billing_period") or {}).get("ends_at"))
        if billing_period_end:
            await _patch_sub(sub, db, current_period_end=billing_period_end)
        await reset_ai_credits(db, user, user.tier)
        await reset_search_limit(db, user, user.tier)
        logger.info(f"[WEBHOOK] Renewal credits reset for {user.email} — tier={user.tier}")

    # Skip invoice creation if already exists (idempotency)
    existing = await db.execute(select(Invoice).where(Invoice.paddle_transaction_id == txn_id))
    if existing.scalars().first():
        return

    totals = (data.get("details") or {}).get("totals") or {}
    amount_str = totals.get("total", "0")
    try:
        amount = int(float(amount_str))
    except (ValueError, TypeError):
        amount = 0
    currency = totals.get("currency_code", "USD").upper()

    invoice_url = None
    if amount > 0:
        try:
            inv_pdf = await asyncio.to_thread(
                paddle_client.get().transactions.get_invoice_pdf,
                txn_id,
            )
            invoice_url = inv_pdf.url if inv_pdf else None
        except Exception:
            pass

    db.add(Invoice(
        user_id=user.id,
        subscription_id=sub.id if sub else None,
        paddle_transaction_id=txn_id,
        amount=amount,
        currency=currency,
        status=PaymentStatus.SUCCEEDED,
        plan=sub.plan if sub else "unknown",
        billing_period=sub.billing_period if sub else "one-time",
        period_start=None,
        period_end=None,
        invoice_url=invoice_url,
    ))
    ev.user_id = user.id
    ev.subscription_id = sub.id if sub else None
    logger.info(f"[WEBHOOK] Invoice created — {amount} {currency} for {user.email}")


async def _on_payment_failed(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    txn_id = data.get("id", "")
    sub_id = data.get("subscription_id", "")
    sub = await _get_sub(sub_id, db) if sub_id else None
    user = await _get_user(data, db)
    if not user and sub:
        user = await db.get(User, sub.user_id)

    if not user:
        logger.warning(f"[WEBHOOK] transaction.payment_failed — user not found: {data}")
        return

    existing = await db.execute(select(Invoice).where(Invoice.paddle_transaction_id == txn_id))
    if not existing.scalars().first() and txn_id:
        db.add(Invoice(
            user_id=user.id,
            subscription_id=sub.id if sub else None,
            paddle_transaction_id=txn_id,
            amount=0,
            currency="USD",
            status=PaymentStatus.FAILED,
            plan=sub.plan if sub else "unknown",
            billing_period=sub.billing_period if sub else "one-time",
            period_start=None,
            period_end=None,
            invoice_url=None,
        ))

    ev.user_id = user.id
    logger.error(f"[WEBHOOK] Payment failed for {user.email} — sub={sub_id}")


async def _on_refund(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    """adjustment.created fires when a refund is issued."""
    txn_id = data.get("transaction_id", "")
    if not txn_id:
        return
    result = await db.execute(select(Invoice).where(Invoice.paddle_transaction_id == txn_id))
    invoice = result.scalars().first()
    if not invoice:
        return
    await db.execute(
        update(Invoice).where(Invoice.id == invoice.id).values(status=PaymentStatus.REFUNDED)
    )
    ev.user_id = invoice.user_id
    ev.subscription_id = invoice.subscription_id
    logger.info(f"[WEBHOOK] Invoice {invoice.id} refunded")


# ── Subscription management ───────────────────────────────────────────────────

async def cancel_subscription(user: User, db: AsyncSession, reason: str | None = None) -> None:
    result = await db.execute(select(Subscription).where(Subscription.user_id == user.id))
    sub = result.scalars().first()
    if not sub:
        raise ValueError("No active subscription found.")
    if sub.cancel_at_period_end:
        raise ValueError("Subscription is already scheduled for cancellation.")

    await asyncio.to_thread(
        paddle_client.get().subscriptions.cancel,
        sub.paddle_subscription_id,
        CancelSubscription(effective_from=SubscriptionEffectiveFrom.NextBillingPeriod),
    )
    if reason:
        await db.execute(
            update(Subscription).where(Subscription.id == sub.id).values(cancellation_reason=reason)
        )
        await db.commit()
    logger.info(f"[BILLING] Cancel scheduled for user {user.id} sub {sub.paddle_subscription_id}")


async def change_subscription_plan(user: User, db: AsyncSession, plan: str, billing_period: str) -> None:
    result = await db.execute(select(Subscription).where(Subscription.user_id == user.id))
    sub = result.scalars().first()
    if not sub:
        raise ValueError("No subscription found.")
    if sub.status not in (SubscriptionStatus.ACTIVE, SubscriptionStatus.ON_HOLD):
        raise ValueError("Subscription is not active.")

    price_id = PLAN_TO_PRICE.get((plan.lower(), billing_period.lower()))
    if not price_id:
        raise ValueError(f"Unknown plan/period: {plan}/{billing_period}")
    if sub.paddle_price_id == price_id:
        raise ValueError("Already on this plan.")

    await asyncio.to_thread(
        paddle_client.get().subscriptions.update,
        sub.paddle_subscription_id,
        UpdateSubscription(
            items=[SubscriptionUpdateItem(price_id=price_id, quantity=1)],
            proration_billing_mode=SubscriptionProrationBillingMode.ProratedImmediately,
        ),
    )
    logger.info(f"[BILLING] Plan change requested for user {user.id}: {sub.plan} → {plan} ({billing_period})")


async def reactivate_subscription(user: User, db: AsyncSession) -> None:
    result = await db.execute(select(Subscription).where(Subscription.user_id == user.id))
    sub = result.scalars().first()
    if not sub:
        raise ValueError("No subscription found.")
    if not sub.cancel_at_period_end:
        raise ValueError("Subscription is not scheduled for cancellation.")

    await asyncio.to_thread(
        paddle_client.get().subscriptions.update,
        sub.paddle_subscription_id,
        UpdateSubscription(scheduled_change=None),
    )
    logger.info(f"[BILLING] Reactivation requested for user {user.id} sub {sub.paddle_subscription_id}")


# ── Handler registry ──────────────────────────────────────────────────────────

_HANDLERS = {
    "subscription.activated":     _on_sub_active,
    "subscription.updated":       _on_sub_updated,
    "subscription.past_due":      _on_sub_past_due,
    "subscription.paused":        _on_sub_paused,
    "subscription.resumed":       _on_sub_resumed,
    "subscription.canceled":      _on_sub_cancelled,   # Paddle uses one 'l'
    "transaction.completed":      _on_transaction_completed,
    "transaction.payment_failed": _on_payment_failed,
    "adjustment.created":         _on_refund,
}
