"""
Rate Limiter Decorators
=======================
Easy-to-use decorators for rate limiting endpoints.
"""
from __future__ import annotations

import hashlib
from functools import wraps
from typing import Callable, Optional, Tuple

from fastapi import HTTPException, Request, Response, status
from redis.asyncio import Redis

from ..config import get_settings
from .config import RateLimitTier
from .core import TieredRateLimiter
from ...services import usage_service
from ..redis import get_redis
from ...core.logging import logger


# =============================================================================
# SINGLETON LIMITER INSTANCE
# =============================================================================

_limiter: Optional[TieredRateLimiter] = None


async def get_limiter() -> TieredRateLimiter:
    """Get or create the singleton rate limiter instance."""
    global _limiter

    if _limiter is None:
        settings = get_settings()

        try:
            redis_client = Redis.from_url(
                f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/0",
                decode_responses=True,
            )
            await redis_client.ping()
        except Exception:
            redis_client = None

        _limiter = TieredRateLimiter(
            redis_client=redis_client,
            key_prefix="ratelimit",
        )

    return _limiter


def get_identifier_and_tier(request: Request) -> Tuple[str, RateLimitTier]:
    """Extract user identifier and tier from request."""
    user = getattr(request.state, "user", None)

    if user is not None:
        user_id = str(user.id)
        user_tier = getattr(user, "tier", "free")
        tier_map = {
            "basic": RateLimitTier.BASIC,
            "pro":   RateLimitTier.PRO,
            "max":   RateLimitTier.MAX,
        }
        tier = tier_map.get(user_tier, RateLimitTier.FREE)
        return f"user:{user_id}", tier

    ip = TieredRateLimiter.get_client_ip(request)
    return f"ip:{ip}", RateLimitTier.ANONYMOUS


# =============================================================================
# DECORATOR: Security Rate Limit (IP-based)
# =============================================================================

def security_rate_limit():
    """
    IP-based security rate limiting.
    Use on auth endpoints to prevent brute force attacks.
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get("request")
            if request is None:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            if request is None:
                return await func(*args, **kwargs)

            ip = TieredRateLimiter.get_client_ip(request)
            endpoint = request.url.path
            limiter_instance = await get_limiter()

            allowed, error_msg, retry_after = await limiter_instance.check_security_limit(
                ip=ip, endpoint=endpoint
            )

            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=error_msg,
                    headers={"Retry-After": str(retry_after)} if retry_after else {},
                )

            return await func(*args, **kwargs)
        return wrapper
    return decorator


# =============================================================================
# DECORATOR: Feature Rate Limit (Tier-based daily)
# =============================================================================

def feature_rate_limit(feature: str):
    """
    Feature-specific daily limits based on user tier.
    Uses unified UsageService for tracking and persistence.
    Injects RateLimit headers into the response.
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request: Request = kwargs.get("request")
            response: Optional[Response] = kwargs.get("response")

            # Try to find request/response in args if not in kwargs
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            if not response:
                for arg in args:
                    if isinstance(arg, Response):
                        response = arg
                        break

            if not request:
                return await func(*args, **kwargs)

            redis_client = await get_redis()

            # We need a DB session to check/restore limits if Redis misses
            from ...db.session import engine
            from sqlmodel.ext.asyncio.session import AsyncSession

            user = getattr(request.state, "user", None)
            client_ip = TieredRateLimiter.get_client_ip(request)

            logger.debug(
                f"[RATE-LIMIT] feature={feature} | ip={client_ip} | "
                f"user={user.id if user else 'anonymous'} | "
                f"tier={user.tier if user else 'none'} | "
                f"response_param={'FOUND' if response else 'MISSING'}"
            )

            async with AsyncSession(engine) as db_session:
                # 1. Check if allowed
                allowed, error_msg, current, limit = await usage_service.check_usage_limit(
                    redis=redis_client,
                    db=db_session,
                    user=user,
                    feature=feature,
                    client_ip=client_ip
                )

                if not allowed:
                    logger.warning(
                        f"[RATE-LIMIT] BLOCKED feature={feature} | ip={client_ip} | "
                        f"user={user.id if user else 'anonymous'} | "
                        f"current={current}/{limit} | msg={error_msg}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=error_msg,
                        headers={
                            "RateLimit-Limit": str(limit),
                            "RateLimit-Remaining": "0",
                            "RateLimit-Reset": "86400",
                            "RateLimit-Policy": f"{feature};q={limit}",
                        },
                    )

                # 2. Execute the actual function
                result = await func(*args, **kwargs)

                # 3. Conditionally increment usage.
                #
                # Fix A — Pagination: pages 2+ are continuations of the same search,
                #   not new searches. Only page=1 counts against the quota.
                #
                # Fix B — Per-user dedup: if the user already searched this exact
                #   query within the last hour, don't charge them again (covers
                #   page refresh, back-navigation, same-tab re-search).
                #   Key: search_dedup:{identifier}:{md5(q+lang+cat+subcat)}  TTL: 1h

                should_increment = True

                if feature == "search":
                    page = int(request.query_params.get("page", "1"))

                    # Fix A: skip pages > 1
                    if page > 1:
                        should_increment = False
                        logger.debug(f"[RATE-LIMIT] pagination page={page} — skipping increment")

                    # Fix C: don't charge for zero-result searches (misspellings, dead-end queries).
                    # We check len(result.hits) — NOT result.total.
                    # result.total comes from Manticore's raw index count and can be >0
                    # even when the returned hits list is empty (e.g. all results filtered
                    # by dedup). result.hits is the actual list the user receives.
                    if should_increment:
                        try:
                            hits_list = getattr(result, "hits", None) or []
                            if len(hits_list) == 0:
                                should_increment = False
                                logger.debug(
                                    f"[RATE-LIMIT] empty hits for q={request.query_params.get('q', '')} "
                                    f"(total={getattr(result, 'total', '?')}) — skipping increment"
                                )
                        except Exception:
                            pass

                    # Fix B: per-user dedup on page=1
                    if should_increment:
                        q_param      = request.query_params.get("q", "")
                        lang_param   = request.query_params.get("language", "english")
                        cat_param    = request.query_params.get("category", "")
                        subcat_param = request.query_params.get("sub_category", "")

                        dedup_raw  = f"{q_param}:{lang_param}:{cat_param}:{subcat_param}"
                        dedup_hash = hashlib.md5(dedup_raw.encode()).hexdigest()

                        identifier = f"user:{user.id}" if user else f"ip:{client_ip}"
                        dedup_key  = f"search_dedup:{identifier}:{dedup_hash}"

                        already_searched = await redis_client.exists(dedup_key)
                        if already_searched:
                            should_increment = False
                            logger.debug(f"[RATE-LIMIT] dedup hit for {identifier} — skipping increment")
                        else:
                            # Mark as searched — expires after 1 hour
                            await redis_client.setex(dedup_key, 3600, "1")

                if should_increment:
                    await usage_service.increment_usage(
                        redis=redis_client,
                        db=db_session,
                        user=user,
                        feature=feature,
                        client_ip=client_ip
                    )

                # 4. Inject headers into response if available
                # Note: This requires the endpoint to accept a 'response' parameter
                if response:
                    # Use the real post-increment count: only add 1 if we actually incremented.
                    # Previously always used current+1 which caused the meter to show -1 remaining
                    # even for zero-result (uncharged) searches, correcting only on refresh.
                    effective_used = current + 1 if should_increment else current
                    response.headers["RateLimit-Limit"] = str(limit)
                    response.headers["RateLimit-Remaining"] = str(max(0, limit - effective_used))
                    response.headers["RateLimit-Reset"] = "86400"
                    response.headers["RateLimit-Policy"] = f"{feature};q={limit}"
                    logger.debug(
                        f"[RATE-LIMIT] HEADERS INJECTED feature={feature} | "
                        f"limit={limit} | remaining={max(0, limit - effective_used)} | "
                        f"incremented={should_increment} | policy={feature};q={limit}"
                    )
                else:
                    logger.warning(
                        f"[RATE-LIMIT] NO RESPONSE PARAM — headers NOT injected for feature={feature}. "
                        f"Endpoint must accept 'response: Response' parameter!"
                    )

                return result

        return wrapper
    return decorator
