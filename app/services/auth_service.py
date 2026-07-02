from datetime import datetime, timezone
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException, status

from ..models.user import User, UserCreate
from ..models.user_usage import UserUsage
from ..core.security import hash_password, verify_password
from ..core.logging import logger



async def create_new_user(db: AsyncSession, user_data: UserCreate) -> User:
    """
    Register a new user in the database.

    Creates both User and UserUsage in a single transaction.
    If either fails, both are rolled back (atomic).
    """
    # 1. Normalize email — prevents duplicate accounts via case variation
    user_data.email = user_data.email.lower().strip()

    # 2. Check for duplicates
    statement = select(User).where(User.email == user_data.email)
    result = await db.exec(statement)
    if result.first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    
    # 2. Secure the password
    hashed_pwd = hash_password(user_data.password)

    # 3. Derive display name from email prefix if none provided
    derived_name = (user_data.full_name or "").strip() or user_data.email.split("@")[0]

    # 4. Create User
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_pwd,
        full_name=derived_name,
    )
    db.add(new_user)
    await db.flush()  # Get user.id without committing
    
    # 4. Create UserUsage (linked to new user)
    user_usage = UserUsage(user_id=new_user.id)
    db.add(user_usage)
    
    # 5. Commit BOTH in one transaction
    await db.commit()
    return new_user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    """
    Check credentials and return user if successful.
    Updates last_login_at timestamp on success.
    """
    statement = select(User).where(User.email == email.lower().strip())
    result = await db.exec(statement)
    user = result.first()
    
    if not user:
        return None
    
    # Check if user has a password (OAuth users don't)
    if not user.hashed_password:
        return None
    
    if not verify_password(password, user.hashed_password):
        return None
    
    # Update last login timestamp
    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user


async def get_oauth_user_only(
    db: AsyncSession,
    email: str,
    oauth_provider: str,
    oauth_id: str,
    avatar_url: str | None = None,
    full_name: str | None = None
) -> User:
    """
    STRICT: Get existing user for OAuth login.
    Fails if the user does not exist.
    """
    email = email.lower().strip()
    statement = select(User).where(User.email == email)
    result = await db.exec(statement)
    user = result.first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found. Please sign up first."
        )
    
    # Update avatar/name/last_login logic (same as get_or_create)
    if not user.oauth_provider:
        user.oauth_provider = oauth_provider
        user.oauth_id = oauth_id
    
    if avatar_url:
        user.oauth_avatar_url = avatar_url
    if full_name and not user.full_name:
        user.full_name = full_name
    
            
    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    await db.commit()
    return user


async def get_or_create_oauth_user(
    db: AsyncSession,
    email: str,
    oauth_provider: str,
    oauth_id: str,
    avatar_url: str | None = None,
    full_name: str | None = None
) -> User:
    """
    Get existing user or create new one for OAuth login.

    Handles three cases:
    1. User exists with same OAuth provider → update avatar/name, return
    2. User exists with password (no OAuth) → link OAuth to existing account
    3. User doesn't exist → create new OAuth user

    Returns the user (existing or newly created).
    """
    email = email.lower().strip()
    statement = select(User).where(User.email == email)
    result = await db.exec(statement)
    user = result.first()
    
    if user:
        # Case 1 & 2: User exists
        logger.info(f"DEBUG: Found existing OAuth user: {email}")
        if not user.oauth_provider:
            # Link OAuth to existing password account
            user.oauth_provider = oauth_provider
            user.oauth_id = oauth_id
        
        # Always update avatar (may change) and fill in full_name if missing
        if avatar_url:
            user.oauth_avatar_url = avatar_url
        if full_name and not user.full_name:
            user.full_name = full_name
        
                    
        # Update last login
        user.last_login_at = datetime.now(timezone.utc)
        db.add(user)
        try:
            await db.commit()
            logger.info("DEBUG: OAuth user update committed")
        except Exception as e:
            logger.error(f"DEBUG: OAuth commit failed: {e}")
            await db.rollback()
            raise
        return user
    
    # Case 3: Create new OAuth user
    new_user = User(
        email=email,
        hashed_password=None,  # OAuth users don't have passwords
        full_name=full_name,
        oauth_provider=oauth_provider,
        oauth_id=oauth_id,
        oauth_avatar_url=avatar_url,
        is_email_verified=True,  # OAuth emails are pre-verified
    )
    db.add(new_user)
    await db.flush()

    # Create UserUsage record
    user_usage = UserUsage(user_id=new_user.id)
    db.add(user_usage)

    await db.commit()
    await db.refresh(new_user)
    
    return new_user
