"""
Rate Limiter Configuration
==========================
All rate limit settings in one place. Easy to modify.

Two types of limits:
1. SECURITY_LIMITS  - IP-based, per-endpoint (brute force protection)
2. FEATURE_LIMITS   - Tier-based, per-feature (business logic)
"""
from __future__ import annotations

from enum import Enum
from typing import Dict

class RateLimitTier(str, Enum):
    ANONYMOUS = "anonymous"
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    MAX = "max"


# =============================================================================
# SECURITY LIMITS (IP-based, per-endpoint)
# Protects against brute force attacks
# =============================================================================

SECURITY_LIMITS: Dict[str, Dict[str, int]] = {
    # Auth endpoints - strict (brute force protection)
    "/auth/signup": {"requests": 3, "window": 60},           # 3/min
    "/auth/login": {"requests": 2, "window": 60},            # 2/min
    "/auth/forgot-password": {"requests": 2, "window": 300}, # 2/5min
    "/auth/verify-otp": {"requests": 5, "window": 60},       # 5/min
    "/auth/reset-password": {"requests": 3, "window": 300},  # 3/5min
}


# =============================================================================
# FEATURE LIMITS (Tier-based)
# 0 = blocked, -1 = unlimited
# Note: search limits are managed monthly via usage_service.MONTHLY_SEARCH_LIMITS
# =============================================================================

FEATURE_LIMITS: Dict[str, Dict[RateLimitTier, int]] = {
    "ai_chat": {
        RateLimitTier.ANONYMOUS: 0,
        RateLimitTier.FREE:      15,
        RateLimitTier.BASIC:     50,
        RateLimitTier.PRO:       100,
        RateLimitTier.MAX:       -1,
    },
    "export": {
        RateLimitTier.ANONYMOUS: 0,
        RateLimitTier.FREE:      5,
        RateLimitTier.BASIC:     10,
        RateLimitTier.PRO:       -1,
        RateLimitTier.MAX:       -1,
    },
}
