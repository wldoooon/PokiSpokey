"""
Verification Service
====================
Handles all OTP-based verification flows:
- Email verification (signup)
- Password reset

All Redis logic is encapsulated here. The auth router just calls these methods.
"""

from datetime import datetime, timezone
from typing import Tuple
from redis.asyncio import Redis
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException, status

from ..models.user import User
from ..core.config import get_settings
from ..core.security import generate_otp, get_password_hash
from ..core.logging import logger
from .email_service import email_service

settings = get_settings()


# =============================================================================
# EMAIL VERIFICATION (Signup Flow)
# =============================================================================

async def send_verification_otp(redis: Redis, email: str) -> str:
    """
    Generate and send a verification OTP for email verification.
    
    Returns the OTP (useful for testing).
    """
    otp = generate_otp(settings.OTP_LENGTH)
    
    # Store OTP with expiration
    await redis.set(f"verify:{email}", otp, ex=settings.VERIFY_OTP_EXPIRE_SECONDS)
    # Reset attempts counter
    await redis.set(f"verify_attempts:{email}", "0", ex=settings.VERIFY_OTP_EXPIRE_SECONDS)
    
    # Send email
    await email_service.send_verification_otp([email], otp)
    logger.info(f"Verification OTP sent to {email}")
    
    return otp


async def verify_email_otp(
    db: AsyncSession,
    redis: Redis,
    email: str,
    otp: str
) -> User:
    """
    Verify the email OTP and mark user as verified.
    
    Returns the verified user.
    Raises HTTPException on failure.
    """
    # Check attempt limit
    attempts = await redis.get(f"verify_attempts:{email}")
    if attempts and int(attempts) >= settings.VERIFY_MAX_ATTEMPTS:
        await redis.delete(f"verify:{email}")
        await redis.delete(f"verify_attempts:{email}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please request a new code."
        )
    
    # Validate OTP
    stored_otp = await redis.get(f"verify:{email}")
    if not stored_otp or stored_otp != otp:
        await redis.incr(f"verify_attempts:{email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code"
        )
    
    # Find user
    statement = select(User).where(User.email == email)
    result = await db.exec(statement)
    user = result.first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.is_email_verified:
        # Already verified, just return
        return user
    
    # Mark as verified
    user.is_email_verified = True
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Cleanup Redis
    await redis.delete(f"verify:{email}")
    await redis.delete(f"verify_attempts:{email}")
    
    logger.info(f"Email verified: {email}")
    return user


async def resend_verification_otp(
    db: AsyncSession,
    redis: Redis,
    email: str
) -> Tuple[bool, str]:
    """
    Resend verification OTP with cooldown and rate limiting.
    
    Returns (success, message).
    """
    # Check cooldown
    cooldown = await redis.get(f"verify_cooldown:{email}")
    if cooldown:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait before requesting another code"
        )
    
    # Check hourly resend limit
    resend_count = await redis.get(f"verify_resends:{email}")
    if resend_count and int(resend_count) >= settings.VERIFY_MAX_RESENDS_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many resend requests. Try again later."
        )
    
    # Find user
    statement = select(User).where(User.email == email)
    result = await db.exec(statement)
    user = result.first()
    
    if not user:
        # Don't reveal if email exists
        return True, "If that email exists, we sent a code."
    
    if user.is_email_verified:
        return True, "Email already verified"
    
    # Generate and store new OTP
    otp = generate_otp(settings.OTP_LENGTH)
    await redis.set(f"verify:{email}", otp, ex=settings.VERIFY_OTP_EXPIRE_SECONDS)
    await redis.set(f"verify_attempts:{email}", "0", ex=settings.VERIFY_OTP_EXPIRE_SECONDS)
    
    # Set cooldown
    await redis.set(f"verify_cooldown:{email}", "1", ex=settings.VERIFY_RESEND_COOLDOWN)
    
    # Increment resend counter
    await redis.incr(f"verify_resends:{email}")
    await redis.expire(f"verify_resends:{email}", 3600)  # 1 hour
    
    # Send email
    await email_service.send_verification_otp([email], otp)
    
    return True, "Verification code sent"


# =============================================================================
# PASSWORD RESET FLOW
# =============================================================================

async def send_password_reset_otp(
    db: AsyncSession,
    redis: Redis,
    email: str
) -> Tuple[bool, str]:
    """
    Send password reset OTP.

    Always returns success — never reveals whether the email exists.
    """
    statement = select(User).where(User.email == email)
    result = await db.exec(statement)
    user = result.first()

    if not user:
        # Silently succeed — don't reveal if email exists
        return True, "If that account exists, we sent a reset code."

    otp = generate_otp(settings.OTP_LENGTH)
    await redis.set(f"reset:{email}", otp, ex=settings.OTP_EXPIRE_SECONDS)
    # Reset attempt counter whenever a fresh OTP is issued
    await redis.set(f"reset_attempts:{email}", "0", ex=settings.OTP_EXPIRE_SECONDS)

    await email_service.send_otp([email], otp)
    logger.info(f"Password reset OTP sent to {email}")

    return True, "If that account exists, we sent a reset code."


async def verify_reset_otp(redis: Redis, email: str, otp: str) -> bool:
    """
    Verify the password reset OTP without consuming it.

    Raises HTTPException on invalid OTP or too many attempts.
    """
    attempts = await redis.get(f"reset_attempts:{email}")
    if attempts and int(attempts) >= settings.VERIFY_MAX_ATTEMPTS:
        await redis.delete(f"reset:{email}")
        await redis.delete(f"reset_attempts:{email}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please request a new code."
        )

    stored_otp = await redis.get(f"reset:{email}")
    if not stored_otp or stored_otp != otp:
        await redis.incr(f"reset_attempts:{email}")
        await redis.expire(f"reset_attempts:{email}", settings.OTP_EXPIRE_SECONDS)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code"
        )

    return True


async def reset_password(
    db: AsyncSession,
    redis: Redis,
    email: str,
    otp: str,
    new_password: str
) -> User:
    """
    Verify OTP, reset the password, and revoke all existing sessions.

    Returns the updated user.
    """
    # Re-verify OTP with attempt tracking (guards against bypassing /verify-reset-otp)
    attempts = await redis.get(f"reset_attempts:{email}")
    if attempts and int(attempts) >= settings.VERIFY_MAX_ATTEMPTS:
        await redis.delete(f"reset:{email}")
        await redis.delete(f"reset_attempts:{email}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please request a new code."
        )

    stored_otp = await redis.get(f"reset:{email}")
    if not stored_otp or stored_otp != otp:
        await redis.incr(f"reset_attempts:{email}")
        await redis.expire(f"reset_attempts:{email}", settings.OTP_EXPIRE_SECONDS)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code"
        )

    # Find user
    statement = select(User).where(User.email == email)
    result = await db.exec(statement)
    user = result.first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update password
    user.hashed_password = get_password_hash(new_password)
    user.password_changed_at = datetime.now(timezone.utc)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Revoke ALL existing sessions so attackers lose access immediately
    session_tokens = await redis.smembers(f"user_sessions:{user.id}")
    if session_tokens:
        refresh_keys = [f"refresh:{token}" for token in session_tokens]
        await redis.delete(*refresh_keys)
        await redis.delete(f"user_sessions:{user.id}")

    # Cleanup OTP keys
    await redis.delete(f"reset:{email}")
    await redis.delete(f"reset_attempts:{email}")

    logger.info(f"Password reset successful for {email} — {len(session_tokens) if session_tokens else 0} session(s) revoked")
    return user
