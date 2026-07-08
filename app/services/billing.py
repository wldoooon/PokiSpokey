import asyncio
from datetime import datetime, timezone
from typing import Optional

from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import select, update

from ..core.config import get_settings
from ..core.logging import logger
from ..core.dodo import dodo_client
from ..models.user import User, UserTier
from ..models.subscription import Subscription, SubscriptionStatus
from ..models.invoice import Invoice, PaymentStatus
from ..models.webhook_event import WebhookEvent
from .usage_service import reset_ai_credits, reset_search_limit

settings = get_settings()

# ── Maps ──────────────────────────────────────────────────────────────────────

def _build_maps() -> tuple[dict, dict]:
    s = settings
    product_map = {
        s.DODO_PRODUCT_BASIC_MONTHLY: ("basic", "monthly"),
        s.DODO_PRODUCT_BASIC_YEARLY:  ("basic", "yearly"),
        s.DODO_PRODUCT_PRO_MONTHLY:   ("pro",   "monthly"),
        s.DODO_PRODUCT_PRO_YEARLY:    ("pro",   "yearly"),
        s.DODO_PRODUCT_MAX_MONTHLY:   ("max",   "monthly"),
        s.DODO_PRODUCT_MAX_YEARLY:    ("max",   "yearly"),
    }
    return product_map, {v: k for k, v in product_map.items()}

PRODUCT_MAP, PLAN_TO_PRODUCT = _build_maps()

PLAN_TO_TIER = {"basic": UserTier.BASIC, "pro": UserTier.PRO, "max": UserTier.MAX}


# ── Checkout + Portal ─────────────────────────────────────────────────────────

async def create_checkout_url(user: User, plan: str, billing_period: str) -> str:
    product_id = PLAN_TO_PRODUCT.get((plan.lower(), billing_period.lower()))
    if not product_id:
        raise ValueError(f"Unknown plan/period: {plan}/{billing_period}")
    customer = (
        {"customer_id": user.dodo_customer_id}
        if user.dodo_customer_id
        else {"email": user.email, "name": user.full_name or user.email}
    )
    resp = await dodo_client.get().checkout_sessions.create(
        product_cart=[{"product_id": product_id, "quantity": 1}],
        return_url=f"{settings.FRONTEND_URL}/billing/success",
        customer=customer,
        metadata={"user_id": str(user.id)},
    )
    if not resp.checkout_url:
        raise ValueError("Dodo returned no checkout URL")
    return resp.checkout_url



# ── Webhook Dispatcher ────────────────────────────────────────────────────────

async def handle_webhook(
    event_id: str,
    event_type: str,
    data: dict,
    raw_body: str,
    db: AsyncSession,
) -> None:
    existing = await db.execute(select(WebhookEvent).where(WebhookEvent.dodo_event_id == event_id))
    if existing.scalars().first():
        logger.info(f"[WEBHOOK] Duplicate skipped: {event_id}")
        return

    ev = WebhookEvent(dodo_event_id=event_id, event_type=event_type, payload=raw_body, processed=False)
    db.add(ev)
    await db.flush()

    try:
        logger.info(f"[WEBHOOK] Processing {event_type} id={event_id}")
        handler = _HANDLERS.get(event_type)
        if handler:
            await handler(data, db, ev)
        elif event_type == "dispute.opened":
            logger.warning(f"[WEBHOOK] Dispute opened — manual review needed: {data}")
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
    """Priority: metadata.user_id → dodo_customer_id → email"""
    if uid := data.get("metadata", {}).get("user_id"):
        if user := await db.get(User, uid):
            return user
    customer = data.get("customer", {})
    if cid := customer.get("customer_id"):
        result = await db.execute(select(User).where(User.dodo_customer_id == cid))
        if user := result.scalars().first():
            return user
    if email := customer.get("email"):
        result = await db.execute(select(User).where(User.email == email))
        return result.scalars().first()
    return None


async def _get_sub(dodo_sub_id: str, db: AsyncSession, retries: int = 3, delay: float = 1.0) -> Optional[Subscription]:
    for attempt in range(retries):
        result = await db.execute(select(Subscription).where(Subscription.dodo_subscription_id == dodo_sub_id))
        sub = result.scalars().first()
        if sub:
            await db.refresh(sub)  # reload after potential sleep to ensure valid session state
            return sub
        if attempt < retries - 1:
            await asyncio.sleep(delay)
    return None


async def _patch_sub(sub: Subscription, db: AsyncSession, **values) -> None:
    """Update subscription via SQLAlchemy update() — bypasses SQLModel sa_column descriptor conflicts on loaded instances."""
    await db.execute(update(Subscription).where(Subscription.id == sub.id).values(**values))
    await db.refresh(sub)


# ── Subscription Handlers ─────────────────────────────────────────────────────

async def _on_sub_active(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    user = await _get_user(data, db)
    if not user:
        raise ValueError(f"User not found for subscription.active: {data}")

    product_id = data.get("product_id", "")
    mapping = PRODUCT_MAP.get(product_id)
    if not mapping:
        raise ValueError(f"Unknown product_id '{product_id}' — add to PRODUCT_MAP or .env")

    plan, billing_period = mapping
    dodo_cus_id = data.get("customer", {}).get("customer_id", "")
    dodo_sub_id = data.get("subscription_id", "")
    period_start = datetime.now(timezone.utc)
    period_end   = _parse_dt(data.get("next_billing_date"))

    if not user.dodo_customer_id:
        user.dodo_customer_id = dodo_cus_id
    user.tier = PLAN_TO_TIER[plan]
    db.add(user)

    result = await db.execute(select(Subscription).where(Subscription.user_id == user.id))
    existing = result.scalars().first()

    if existing:
        await _patch_sub(existing, db,
            dodo_subscription_id=dodo_sub_id,
            dodo_customer_id=dodo_cus_id,
            dodo_product_id=product_id,
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
            dodo_subscription_id=dodo_sub_id,
            dodo_customer_id=dodo_cus_id,
            dodo_product_id=product_id,
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
    ev.dodo_subscription_id = sub.dodo_subscription_id
    logger.success(f"[WEBHOOK] {user.email} upgraded to {plan} ({billing_period})")


async def _on_sub_renewed(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    sub = await _get_sub(data.get("subscription_id", ""), db)
    if not sub:
        raise ValueError(f"Subscription not found: {data.get('subscription_id')}")
    await _patch_sub(sub, db,
        status=SubscriptionStatus.ACTIVE,
        cancel_at_period_end=False,
        current_period_start=datetime.now(timezone.utc),
        current_period_end=_parse_dt(data.get("next_billing_date")),
    )
    user = await db.get(User, sub.user_id)
    if user:
        await reset_ai_credits(db, user, user.tier)
        await reset_search_limit(db, user, user.tier)
    ev.subscription_id = sub.id
    ev.user_id = sub.user_id
    logger.info(f"[WEBHOOK] Subscription {sub.id} renewed until {sub.current_period_end}")


async def _on_sub_updated(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    sub = await _get_sub(data.get("subscription_id", ""), db)
    if not sub:
        logger.info(f"[WEBHOOK] subscription.updated — sub not found yet, skipping: {data.get('subscription_id')}")
        return
    cancel_at = data.get("cancel_at_next_billing_date")
    if cancel_at is True:
        await _patch_sub(sub, db, cancel_at_period_end=True)
        logger.info(f"[WEBHOOK] Subscription {sub.id} marked for end-of-period cancellation")
    elif cancel_at is False:
        await _patch_sub(sub, db, cancel_at_period_end=False)
        logger.info(f"[WEBHOOK] Subscription {sub.id} reactivated — cancellation undone")
    ev.subscription_id = sub.id
    ev.user_id = sub.user_id


async def _on_sub_cancelled(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    sub = await _get_sub(data.get("subscription_id", ""), db)
    if not sub:
        raise ValueError(f"Subscription not found: {data.get('subscription_id')}")
    user = await db.get(User, sub.user_id)
    if not user:
        raise ValueError(f"User {sub.user_id} not found during cancellation")
    user.tier = UserTier.FREE
    db.add(user)
    await _patch_sub(sub, db,
        status=SubscriptionStatus.CANCELLED,
        cancel_at_period_end=False,
        canceled_at=_parse_dt(data.get("cancelled_at")) or datetime.now(timezone.utc),
    )
    await reset_ai_credits(db, user, UserTier.FREE)
    await reset_search_limit(db, user, UserTier.FREE)
    ev.subscription_id = sub.id
    ev.user_id = sub.user_id
    logger.info(f"[WEBHOOK] {user.email} downgraded to free — subscription cancelled")


async def _on_sub_on_hold(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    sub = await _get_sub(data.get("subscription_id", ""), db)
    if not sub:
        raise ValueError(f"Subscription not found: {data.get('subscription_id')}")
    await _patch_sub(sub, db, status=SubscriptionStatus.ON_HOLD)
    ev.subscription_id = sub.id
    ev.user_id = sub.user_id
    logger.warning(f"[WEBHOOK] Subscription {sub.id} on hold — dunning started")


async def _on_sub_expired(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    sub = await _get_sub(data.get("subscription_id", ""), db)
    if not sub:
        raise ValueError(f"Subscription not found: {data.get('subscription_id')}")
    user = await db.get(User, sub.user_id)
    if not user:
        raise ValueError(f"User {sub.user_id} not found during expiry")
    user.tier = UserTier.FREE
    db.add(user)
    await _patch_sub(sub, db, status=SubscriptionStatus.EXPIRED, ended_at=datetime.now(timezone.utc))
    await reset_ai_credits(db, user, UserTier.FREE)
    await reset_search_limit(db, user, UserTier.FREE)
    ev.subscription_id = sub.id
    ev.user_id = sub.user_id
    logger.info(f"[WEBHOOK] {user.email} downgraded to free — subscription expired")


async def _on_sub_plan_changed(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    sub = await _get_sub(data.get("subscription_id", ""), db)
    if not sub:
        raise ValueError(f"Subscription not found: {data.get('subscription_id')}")
    user = await db.get(User, sub.user_id)
    if not user:
        raise ValueError(f"User {sub.user_id} not found during plan change")

    new_product_id = data.get("product_id", "")
    plan, billing_period = PRODUCT_MAP.get(new_product_id) or (sub.plan, sub.billing_period)
    if not PRODUCT_MAP.get(new_product_id):
        logger.warning(f"[WEBHOOK] Unknown product_id '{new_product_id}' on plan change — keeping existing")

    new_tier = PLAN_TO_TIER.get(plan, UserTier.FREE)
    user.tier = new_tier
    db.add(user)
    await _patch_sub(sub, db,
        plan=plan,
        billing_period=billing_period,
        dodo_product_id=new_product_id,
        status=SubscriptionStatus.ACTIVE,
        current_period_start=datetime.now(timezone.utc),
        current_period_end=_parse_dt(data.get("next_billing_date")),
    )
    await reset_ai_credits(db, user, new_tier)
    await reset_search_limit(db, user, new_tier)
    ev.subscription_id = sub.id
    ev.user_id = sub.user_id
    logger.info(f"[WEBHOOK] {user.email} plan changed to {plan} ({billing_period})")


# ── Cancel Subscription ───────────────────────────────────────────────────────

async def cancel_subscription(user: User, db: AsyncSession) -> None:
    result = await db.execute(select(Subscription).where(Subscription.user_id == user.id))
    sub = result.scalars().first()
    if not sub:
        raise ValueError("No active subscription found.")
    if sub.cancel_at_period_end:
        raise ValueError("Subscription is already scheduled for cancellation.")

    await dodo_client.get().subscriptions.update(
        sub.dodo_subscription_id,
        cancel_at_next_billing_date=True,
        cancel_reason="cancelled_by_customer",  # type: ignore[arg-type]
    )
    logger.info(f"[BILLING] Cancel scheduled for user {user.id} sub {sub.dodo_subscription_id}")


# ── Reactivate Subscription ───────────────────────────────────────────────────

async def reactivate_subscription(user: User, db: AsyncSession) -> None:
    result = await db.execute(select(Subscription).where(Subscription.user_id == user.id))
    sub = result.scalars().first()
    if not sub:
        raise ValueError("No subscription found.")
    if not sub.cancel_at_period_end:
        raise ValueError("Subscription is not scheduled for cancellation.")

    await dodo_client.get().subscriptions.update(
        sub.dodo_subscription_id,
        cancel_at_next_billing_date=False,
    )
    logger.info(f"[BILLING] Reactivation requested for user {user.id} sub {sub.dodo_subscription_id}")


# ── Payment Handlers ──────────────────────────────────────────────────────────

async def _on_payment(data: dict, db: AsyncSession, ev: WebhookEvent, status: PaymentStatus) -> None:
    payment_id = data.get("payment_id") or data.get("id", "")

    existing = await db.execute(select(Invoice).where(Invoice.dodo_payment_id == payment_id))
    if existing.scalars().first():
        return

    sub_id = data.get("subscription_id", "")
    sub = await _get_sub(sub_id, db) if sub_id else None
    user = await db.get(User, sub.user_id) if sub else await _get_user(data, db)

    if not user:
        logger.warning(f"[WEBHOOK] No user found for invoice — payment_id={payment_id}")
        return

    db.add(Invoice(
        user_id=user.id,
        subscription_id=sub.id if sub else None,
        dodo_payment_id=payment_id,
        amount=data.get("amount") if data.get("amount") is not None else data.get("total_amount", 0),
        currency=data.get("currency", "USD").upper(),
        status=status,
        plan=sub.plan if sub else data.get("product_id", "unknown"),
        billing_period=sub.billing_period if sub else "one-time",
        period_start=None,
        period_end=None,
        invoice_url=data.get("invoice_url") or data.get("pdf_url"),
    ))
    ev.user_id = user.id
    ev.subscription_id = sub.id if sub else None
    logger.info(f"[WEBHOOK] Invoice {status.value} — {data.get('total_amount', 0)} {data.get('currency', 'USD')} for {user.email}")


async def _on_refund(data: dict, db: AsyncSession, ev: WebhookEvent) -> None:
    payment_id = data.get("payment_id") or data.get("id", "")
    result = await db.execute(select(Invoice).where(Invoice.dodo_payment_id == payment_id))
    invoice = result.scalars().first()
    if not invoice:
        return
    await db.execute(update(Invoice).where(Invoice.id == invoice.id).values(status=PaymentStatus.REFUNDED))
    ev.user_id = invoice.user_id
    ev.subscription_id = invoice.subscription_id
    logger.info(f"[WEBHOOK] Invoice {invoice.id} refunded")


# ── Handler Registry ──────────────────────────────────────────────────────────

_HANDLERS = {
    "subscription.active":       _on_sub_active,
    "subscription.updated":      _on_sub_updated,
    "subscription.renewed":      _on_sub_renewed,
    "subscription.cancelled":    _on_sub_cancelled,
    "subscription.on_hold":      _on_sub_on_hold,
    "subscription.expired":      _on_sub_expired,
    "subscription.plan_changed": _on_sub_plan_changed,
    "payment.succeeded": lambda d, db, ev: _on_payment(d, db, ev, PaymentStatus.SUCCEEDED),
    "payment.failed":    lambda d, db, ev: _on_payment(d, db, ev, PaymentStatus.FAILED),
    "refund.succeeded":  _on_refund,
}
