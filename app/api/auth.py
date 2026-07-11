from fastapi import APIRouter, Depends, HTTPException, status, Response, Body, Request
from fastapi.responses import HTMLResponse
from sqlmodel.ext.asyncio.session import AsyncSession
from redis.asyncio import Redis

from ..db.session import get_session
from ..models.user import UserCreate, User
from ..services import usage_service
from ..services.auth_service import create_new_user, authenticate_user, get_or_create_oauth_user
from ..services import verification_service
from ..services.oauth_service import oauth
from ..core.security import create_access_token, create_refresh_token
from ..core.config import get_settings
from ..core.redis import get_redis
from ..core.limiter import security_rate_limit
from ..core.logging import logger
from .deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


REFRESH_COOKIE_NAME = "refresh_token"


def _set_access_cookie(response: Response, access_token: str):
    """Set only the short-lived access token cookie."""
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        domain=settings.COOKIE_DOMAIN if settings.COOKIE_DOMAIN else None,
    )


async def _set_auth_cookies(response: Response, access_token: str, user_id: str, redis: Redis):
    """
    Set BOTH auth cookies and store the refresh token in Redis.

    Access token  → short-lived JWT (30 min)  — used on every request
    Refresh token → long-lived random secret (7 days) stored in Redis
                    — used only to get a new access token

    Why a random string instead of a second JWT?
    JWTs can't be invalidated before their expiry date.
    A random token stored in Redis can be deleted at any time (logout, password change, etc.)
    """
    # 1. Access token cookie
    _set_access_cookie(response, access_token)

    # 2. Generate refresh token and store in Redis: refresh:{token} -> user_id
    refresh_token = create_refresh_token()
    ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60  # days → seconds
    await redis.set(f"refresh:{refresh_token}", str(user_id), ex=ttl)

    # 3. Track token in user's session set for bulk revocation (e.g. on password reset)
    await redis.sadd(f"user_sessions:{user_id}", refresh_token)
    await redis.expire(f"user_sessions:{user_id}", ttl)

    # 4. Refresh token cookie (same security settings, longer max_age)
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        max_age=ttl,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        domain=settings.COOKIE_DOMAIN if settings.COOKIE_DOMAIN else None,
    )


@router.post("/signup", status_code=status.HTTP_201_CREATED)
@security_rate_limit()
async def signup(
    request: Request,
    user_data: UserCreate,
    db: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis)
):
    """Create new user and send verification email."""
    user = await create_new_user(db, user_data)
    await verification_service.send_verification_otp(redis, user.email)
    
    logger.info(f"New user signup: {user.email}")
    return {
        "message": "Account created. Please check your email for verification code.",
        "email": user.email
    }


@router.post("/verify-email")
@security_rate_limit()
async def verify_email(
    request: Request,
    email: str = Body(...),
    otp: str = Body(...),
    response: Response = None,
    db: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis)
):
    """Verify email with OTP code."""
    user = await verification_service.verify_email_otp(db, redis, email, otp)
    
    access_token = create_access_token(data={"sub": str(user.id)})
    await _set_auth_cookies(response, access_token, str(user.id), redis)
    
    logger.info(f"Email verified: {email}")
    return {
        "message": "Email verified successfully",
        "user": {"id": str(user.id), "email": user.email, "tier": user.tier}
    }


@router.post("/resend-verification")
@security_rate_limit()
async def resend_verification(
    request: Request,
    email: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis)
):
    """Resend verification email."""
    _, message = await verification_service.resend_verification_otp(db, redis, email)
    return {"message": message}



@router.post("/login")
@security_rate_limit()
async def login(
    request: Request,
    response: Response,
    login_data: UserCreate,
    db: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis)
):
    """Login with email and password."""
    user = await authenticate_user(db, login_data.email, login_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    if not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "message": "Please verify your email before logging in.",
                "error_code": "EMAIL_NOT_VERIFIED",
                "email": user.email
            }
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    await _set_auth_cookies(response, access_token, str(user.id), redis)
    
    return {
        "message": "Login successful",
        "user": {"id": str(user.id), "email": user.email, "tier": user.tier}
    }


@router.get("/me")
async def me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis)
):
    """Get current authenticated user with real-time usage stats."""
    usage_data = await usage_service.get_user_usage_stats(
        redis=redis,
        db=db,
        user=current_user
    )

    # Return a plain dict — DON'T assign to current_user.usage
    # because that's a SQLAlchemy Relationship field (expects UserUsage model, not dict)
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
        "tier": current_user.tier,
        "is_email_verified": current_user.is_email_verified,
        "is_tour_seen": current_user.is_tour_seen,
        "oauth_provider": current_user.oauth_provider,
        "oauth_avatar_url": current_user.oauth_avatar_url,
        "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "usage": usage_data["monthly"]  # We only need the monthly stats for the frontend store
    }

@router.post("/mark-tour-seen")
async def mark_tour_seen(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Mark the search tour as seen so it never auto-fires again for this user."""
    current_user.is_tour_seen = True
    db.add(current_user)
    await db.commit()
    return {"ok": True}


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    redis: Redis = Depends(get_redis)
):
    """Logout: clear both cookies and revoke the refresh token from Redis."""
    # Revoke refresh token from Redis so it can never be used again
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token:
        user_id = await redis.get(f"refresh:{refresh_token}")
        await redis.delete(f"refresh:{refresh_token}")
        if user_id:
            await redis.srem(f"user_sessions:{user_id}", refresh_token)

    # Delete access token cookie
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        domain=settings.COOKIE_DOMAIN if settings.COOKIE_DOMAIN else None,
    )
    # Delete refresh token cookie
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        domain=settings.COOKIE_DOMAIN if settings.COOKIE_DOMAIN else None,
    )
    return {"message": "Logged out"}


@router.post("/refresh")
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis)
):

    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided. Please log in again."
        )

    # Look up user_id stored in Redis for this token
    user_id = await redis.get(f"refresh:{refresh_token}")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or has expired. Please log in again."
        )

    # Fetch the user from DB to make sure they still exist and are active
    from ..models.user import User
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        await redis.delete(f"refresh:{refresh_token}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive."
        )

    # TOKEN ROTATION: invalidate the old refresh token and remove from session set
    await redis.delete(f"refresh:{refresh_token}")
    await redis.srem(f"user_sessions:{str(user.id)}", refresh_token)

    # Issue fresh access token + new refresh token (new token is added to session set)
    new_access_token = create_access_token(data={"sub": str(user.id)})
    await _set_auth_cookies(response, new_access_token, str(user.id), redis)

    logger.info(f"Token refreshed for user {user.id}")
    return {"message": "Token refreshed successfully"}



@router.post("/forgot-password")
@security_rate_limit()
async def forgot_password(
    request: Request,
    email: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis)
):
    """Send password reset OTP."""
    _, message = await verification_service.send_password_reset_otp(db, redis, email)
    return {"message": message}


@router.post("/verify-reset-otp")
@security_rate_limit()
async def verify_reset_otp(
    request: Request,
    email: str = Body(...),
    otp: str = Body(...),
    redis: Redis = Depends(get_redis)
):
    """Verify password reset OTP without consuming it."""
    await verification_service.verify_reset_otp(redis, email, otp)
    return {"message": "Code valid"}


@router.post("/reset-password")
@security_rate_limit()
async def reset_password(
    request: Request,
    email: str = Body(...),
    otp: str = Body(...),
    new_password: str = Body(...),
    db: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis)
):
    """Reset password with OTP."""
    await verification_service.reset_password(db, redis, email, otp, new_password)
    return {"message": "Password updated successfully"}


@router.get("/google/login")
async def google_login(request: Request, mode: str = "login"):
    """Redirect to Google OAuth."""
    # Store mode in session because Google won't return it to us
    request.session["oauth_mode"] = mode
    logger.info(f"DEBUG: Starting OAuth flow in mode: {mode}")
    
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(
        request, 
        redirect_uri,
        scope='openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
    )


@router.get("/google/callback", response_class=HTMLResponse)
async def google_callback(
    request: Request,
    db: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis)
):
    """Handle Google OAuth callback."""
    import time
    start_time = time.time()
    logger.info("DEBUG: Google callback started")
    try:
        token = await oauth.google.authorize_access_token(request)
        logger.info(f"DEBUG: Token exchanged in {time.time() - start_time:.4f}s")
        
        user_info = token.get('userinfo')
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")

        email = user_info.get('email')
        google_id = user_info.get('sub')
        avatar = user_info.get('picture')
        full_name = user_info.get('name')

        # Read mode from session (defaults to login if missing)
        mode = request.session.pop("oauth_mode", "login")
        logger.info(f"DEBUG: Handling OAuth callback in mode: {mode}")

        logger.info(f"DEBUG: Processing user: {email}")
        user_start = time.time()
        
        if mode == "signup":
            user = await get_or_create_oauth_user(
                db=db,
                email=email,
                oauth_provider="google",
                oauth_id=google_id,
                avatar_url=avatar,
                full_name=full_name
            )
        else:
            from ..services.auth_service import get_oauth_user_only
            user = await get_oauth_user_only(
                db=db,
                email=email,
                oauth_provider="google",
                oauth_id=google_id,
                avatar_url=avatar,
                full_name=full_name
            )
        
        logger.info(f"DEBUG: User handled in {time.time() - user_start:.4f}s")

        access_token = create_access_token(data={"sub": str(user.id)})
        logger.info("DEBUG: Access token created")

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head><title>Authentication Successful</title></head>
        <body>
            <p>Authentication successful! This window will close automatically.</p>
            <script>
                console.log('DEBUG: Sending postMessage to opener');
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'oauth-success',
                        user: {{
                            id: '{user.id}',
                            email: '{user.email}',
                            tier: '{user.tier}'
                        }}
                    }}, '*');
                }}
                window.close();
            </script>
        </body>
        </html>
        """

        response = HTMLResponse(content=html_content)
        await _set_auth_cookies(response, access_token, str(user.id), redis)
        logger.info(f"DEBUG: Google callback finished total: {time.time() - start_time:.4f}s")
        return response
    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        # Sanitize error message to prevent XSS injection
        import html
        
        # Expert Move: Extract detail from HTTPException to avoid "404: ..." prefixes
        error_msg = str(e)
        if hasattr(e, 'detail'):
            error_msg = e.detail
        elif hasattr(e, 'message'):
            error_msg = e.message
            
        safe_error = html.escape(error_msg)
        # Also escape single quotes for JS string context
        safe_error_js = safe_error.replace("'", "\\'")
        
        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head><title>Authentication Failed</title></head>
        <body>
            <p>Authentication failed. This window will close shortly.</p>
            <script>
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'oauth-error',
                        error: '{safe_error_js}'
                    }}, '*');
                }}
                setTimeout(() => window.close(), 3000);
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=400)

