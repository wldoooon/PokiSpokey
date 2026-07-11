from calendar import monthrange
from datetime import date, datetime, timezone
from typing import Optional, Tuple
from redis.asyncio import Redis
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models.user import User, UserTier
from ..models.user_usage import UserUsage
from ..core.config import get_settings
from ..core.logging import logger

settings = get_settings()

MONTHLY_SEARCH_LIMITS = {
    UserTier.FREE:  50,
    UserTier.BASIC: 300,
    UserTier.PRO:   -1,
    UserTier.MAX:   -1,
}

# Monthly AI credit (Sparks) allocation per tier.
TIER_SPARKS = {
    UserTier.FREE:  15_000,
    UserTier.BASIC: 800_000,
    UserTier.PRO:   5_000_000,
    UserTier.MAX:   15_000_000,
}

ANONYMOUS_LIMITS = {
    "search": 6
}


def _get_redis_key(identifier: str, feature: str) -> str:
    today = date.today()
    month_key = f"{today.year}-{today.month:02}"
    return f"usage:{identifier}:{feature}:{month_key}"


async def check_usage_limit(
    redis: Redis,
    db: AsyncSession,
    user: Optional[User],
    feature: str,
    client_ip: str = "unknown"
) -> Tuple[bool, Optional[str], int, int]:
    """
    Check if user can perform the action.

    Returns: (allowed, error_message, current_count, limit)
    """
    if user:
        identifier = f"user:{user.id}"
        # Use per-user quota stored in DB (overridable per user)
        usage = await db.get(UserUsage, user.id)
        limit = usage.total_searches if usage else MONTHLY_SEARCH_LIMITS.get(user.tier, 50)
    else:
        identifier = f"ip:{client_ip}"
        limit = ANONYMOUS_LIMITS.get(feature, 0)
    
    # -1 means unlimited
    if limit == -1:
        return True, None, 0, -1
    
    # 0 means blocked
    if limit == 0:
        return False, f"Upgrade to access {feature}. Not available on your plan.", 0, 0
    
    # Check Redis counter
    redis_key = _get_redis_key(identifier, feature)
    current_count = await redis.get(redis_key)
    
    if current_count is None:
        # Redis miss - try to restore from PostgreSQL (for logged-in users)
        if user:
            current_count = await _restore_from_db(redis, db, user, feature, redis_key)
        else:
            current_count = 0
    else:
        current_count = int(current_count)
    
    # Check if over limit
    if current_count >= limit:
        return False, f"Monthly {feature} limit reached ({limit}/month). Resets next month.", current_count, limit
    
    return True, None, current_count, limit


async def increment_usage(
    redis: Redis,
    db: AsyncSession,
    user: Optional[User],
    feature: str,
    client_ip: str = "unknown"
) -> int:
    """
    Increment usage counter in Redis.
    Returns the new count.
    """
    if user:
        identifier = f"user:{user.id}"
        # Track this user as 'dirty' for the background sync task
        await redis.sadd("usage:dirty_users", str(user.id))
    else:
        identifier = f"ip:{client_ip}"
    
    redis_key = _get_redis_key(identifier, feature)
    
    # Increment and set TTL to end-of-month + 48h buffer.
    # A flat 48h TTL caused cross-month leakage: a key set on the last day of
    # the month would still be alive (and returned) after the month rolled over,
    # making the restore-from-db correctly return 0 but Redis returning stale data.
    new_count = await redis.incr(redis_key)
    today = date.today()
    _, days_in_month = monthrange(today.year, today.month)
    seconds_left_in_month = (
        (days_in_month - today.day) * 86400
        + (23 - datetime.now().hour) * 3600
        + (59 - datetime.now().minute) * 60
        + (60 - datetime.now().second)
    )
    ttl = seconds_left_in_month + 48 * 3600  # month remainder + 48h buffer
    await redis.expire(redis_key, max(ttl, 3600))
    
    return new_count





async def get_anonymous_usage_stats(redis: Redis, client_ip: str) -> dict:
    """Return usage stats for an unauthenticated (guest) user tracked by IP."""
    today = date.today()
    month_key = f"{today.year}-{today.month:02}"
    redis_key = f"usage:ip:{client_ip}:search:{month_key}"

    current_str = await redis.get(redis_key)
    current = int(current_str or 0)
    limit = ANONYMOUS_LIMITS.get("search", 3)

    return {
        "tier": "guest",
        "monthly": {
            "search": {
                "current": current,
                "limit": limit,
                "remaining": max(0, limit - current),
            },
            "ai_chat": {
                "balance": 0,
                "limit": 0,
                "remaining": 0,
            },
        },
    }


async def get_user_usage_stats(
    redis: Redis,
    db: AsyncSession,
    user: User
) -> dict:
    """
    Get current usage stats for a user.
    Returns dict with current counts and limits.
    """
    today = date.today()
    month_key = f"{today.year}-{today.month:02}"
    identifier = f"user:{user.id}"
    tier = user.tier
    
    # Get current search count from Redis
    search_count_str = await redis.get(f"usage:{identifier}:search:{month_key}")
    search_count = int(search_count_str or 0)
    
    # Get usage record from PostgreSQL for AI balance and per-user search quota
    try:
        usage = await db.get(UserUsage, user.id)
    except Exception as e:
        logger.error(f"Error fetching UserUsage for user {user.id}: {e}")
        usage = None
    
    ai_limit = TIER_SPARKS.get(tier, TIER_SPARKS[UserTier.FREE])
    search_limit = usage.total_searches if usage else MONTHLY_SEARCH_LIMITS.get(tier, 50)

    raw_balance = usage.ai_credit_balance if usage else 0
    balance = min(raw_balance, ai_limit) if ai_limit != -1 else raw_balance

    return {
        "tier": tier,
        "monthly": {
            "search": {
                "current": search_count,
                "limit": search_limit,
                "remaining": max(0, search_limit - search_count) if search_limit != -1 else -1
            },
            "ai_chat": {
                "balance": balance,
                "limit": ai_limit,
                "remaining": balance
            },
        },
    }


async def _restore_from_db(
    redis: Redis,
    db: AsyncSession,
    user: User,
    feature: str,
    redis_key: str
) -> int:
    """
    Restore Redis counter from PostgreSQL after cache miss.
    This handles the case where Redis crashed/restarted.
    """
    try:
        usage = await db.get(UserUsage, user.id)
        if not usage:
            return 0
        
        today = date.today()
        
        # If the DB date is not from current month, counts are effectively 0
        if usage.usage_reset_at.month != today.month or usage.usage_reset_at.year != today.year:
            return 0
        
        # Get the count from DB
        if feature == "search":
            count = usage.searches_count
        else:
            count = 0
        
        # Restore to Redis
        if count > 0:
            await redis.set(redis_key, count, ex=48 * 60 * 60)
        
        return count
        
    except Exception as e:
        logger.error(f"Failed to restore from DB: {e}")
        return 0

async def sync_all_dirty_users(redis: Redis):
    """
    Background task to sync usage from Redis to PostgreSQL for all 'dirty' users.
    Called by APScheduler every few minutes.
    """
    from ..db.session import engine
    from sqlmodel.ext.asyncio.session import AsyncSession
    from ..models.user_usage import UserUsage
    from ..models.user import User, UserTier
    import uuid
    from datetime import date

    # 1. Read dirty user IDs without removing them — safe against crashes
    user_ids = await redis.smembers("usage:dirty_users")
    if not user_ids:
        return

    # Process in batches of 100
    user_ids = list(user_ids)[:100]
    logger.info(f"Starting usage sync for {len(user_ids)} users")

    today = date.today()
    month_key = f"{today.year}-{today.month:02}"
    synced_count = 0
    synced_ids = []

    async with AsyncSession(engine) as session:
        for user_id_str in user_ids:
            try:
                user_id = uuid.UUID(user_id_str)
                identifier = f"user:{user_id}"

                search_count = int(await redis.get(f"usage:{identifier}:search:{month_key}") or 0)

                # Get the DB record
                usage = await session.get(UserUsage, user_id)
                if not usage:
                    synced_ids.append(user_id_str)  # remove ghost IDs
                    continue

                # Check if DB date is from current month
                is_current_month = (
                    usage.usage_reset_at.month == today.month and
                    usage.usage_reset_at.year == today.year
                )

                if not is_current_month:
                    # Start the new month
                    usage.usage_reset_at = datetime.now(timezone.utc)

                    # Free Tier Eternal Death Bug Fix: Reset FREE users' Sparks on the 1st
                    user = await session.get(User, user_id)
                    if user and user.tier == UserTier.FREE:
                        usage.ai_credit_balance = TIER_SPARKS[UserTier.FREE]

                usage.searches_count = search_count
                usage.updated_at = datetime.now(timezone.utc)

                session.add(usage)
                synced_ids.append(user_id_str)
                synced_count += 1
            except Exception as e:
                logger.error(f"Failed to sync user {user_id_str}: {e}")
                # Leave in the set — will be retried next run

        await session.commit()

    # 2. Only remove IDs that were successfully committed
    if synced_ids:
        await redis.srem("usage:dirty_users", *synced_ids)
    
    if synced_count > 0:
        logger.success(f"Usage sync complete: {synced_count} records updated")


async def reset_ai_credits(db: AsyncSession, user: User, tier: UserTier) -> None:
    """Top up AI credit balance to the tier's monthly allocation. Called on subscription events."""
    from sqlalchemy import update as sa_update
    new_balance = TIER_SPARKS.get(tier, TIER_SPARKS[UserTier.FREE])
    await db.execute(
        sa_update(UserUsage)
        .where(UserUsage.user_id == user.id)
        .values(ai_credit_balance=new_balance)
    )
    logger.info(f"[Credits] Reset AI credits for user {user.id} → {new_balance} ({tier})")


async def reset_search_limit(db: AsyncSession, user: User, tier: UserTier) -> None:
    """Set per-user monthly search quota to the tier's allocation. Called on subscription events."""
    from sqlalchemy import update as sa_update
    new_limit = MONTHLY_SEARCH_LIMITS.get(tier, MONTHLY_SEARCH_LIMITS[UserTier.FREE])
    await db.execute(
        sa_update(UserUsage)
        .where(UserUsage.user_id == user.id)
        .values(total_searches=new_limit)
    )
    logger.info(f"[Search] Reset search limit for user {user.id} → {new_limit} ({tier})")


async def check_ai_credits(db: AsyncSession, user: User) -> Tuple[bool, Optional[str], int]:
    """Read-only pre-flight check before streaming starts."""
    usage = await db.get(UserUsage, user.id)
    if not usage:
        return False, "Wallet not found", 0

    if usage.ai_credit_balance == -1:
        return True, None, -1  # unlimited (MAX tier)

    if usage.ai_credit_balance <= 0:
        return False, "Out of Sparks! Please upgrade your plan to continue chatting.", 0

    return True, None, usage.ai_credit_balance


async def deduct_ai_credits(db: AsyncSession, user: User, total_tokens_used: int) -> int:
    """
    Atomically deducts tokens from the user's PostgreSQL wallet using SELECT FOR UPDATE.

    The previous implementation had a TOCTOU race condition:
      check_ai_credits() passed  →  stream ran  →  deduct_ai_credits() ran
    Two concurrent requests with balance=1 could both pass the pre-flight check,
    both stream, and both deduct — leaving the balance at -1 (or lower).

    SELECT FOR UPDATE acquires a row-level lock for the duration of the transaction,
    so concurrent deductions are serialised: the second request will wait until the
    first commits, then see the updated (possibly zero) balance and refuse to deduct.
    """
    from sqlalchemy import select, text
    from sqlmodel import col

    if total_tokens_used <= 0:
        return 0

    try:
        # Lock the row for the duration of this transaction
        stmt = (
            select(UserUsage)
            .where(col(UserUsage.user_id) == user.id)
            .with_for_update()
        )
        result = await db.execute(stmt)  # type: ignore[arg-type]
        usage = result.scalars().one_or_none()

        if not usage:
            logger.error(f"[AI Credits] UserUsage row not found for user {user.id}")
            return 0

        if usage.ai_credit_balance == -1:
            return -1  # unlimited (MAX tier) — no deduction needed

        if usage.ai_credit_balance <= 0:
            # Balance was exhausted between the pre-flight check and now
            logger.warning(
                f"[AI Credits] Balance already 0 for user {user.id} — skipping deduction"
            )
            await db.rollback()
            return 0

        # Safe to deduct now — we hold the row lock
        usage.ai_credit_balance = max(0, usage.ai_credit_balance - total_tokens_used)
        usage.updated_at = datetime.now(timezone.utc)
        usage.total_ai_chats += 1

        db.add(usage)
        await db.commit()
        await db.refresh(usage)

        logger.info(
            f"[AI Credits] Deducted {total_tokens_used} tokens from user {user.id}. "
            f"New balance: {usage.ai_credit_balance}"
        )
        return usage.ai_credit_balance

    except Exception as e:
        await db.rollback()
        logger.error(f"[AI Credits] Deduction failed for user {user.id}: {e}")
        raise
