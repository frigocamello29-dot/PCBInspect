import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
import bcrypt as _bcrypt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.refresh_token import RefreshToken
from app.models.user import User

ALGORITHM = "HS256"


def _hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt(rounds=12)).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode(), hashed.encode())


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _make_access_token(user_id: uuid.UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_EXPIRES_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        settings.JWT_SECRET_KEY,
        algorithm=ALGORITHM,
    )


def _make_refresh_token() -> str:
    return secrets.token_urlsafe(64)


async def register(db: AsyncSession, email: str, password: str, full_name: str) -> User:
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise ValueError("Email already registered")

    user = User(
        email=email,
        password_hash=_hash_password(password),
        full_name=full_name,
    )
    db.add(user)
    await db.flush()
    return user


async def login(db: AsyncSession, email: str, password: str) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not _verify_password(password, user.password_hash):
        raise ValueError("Invalid credentials")
    if not user.is_active:
        raise ValueError("Account inactive")
    return user


async def create_token_pair(db: AsyncSession, user: User, family_id: uuid.UUID | None = None) -> tuple[str, str]:
    """Returns (access_token, raw_refresh_token) and persists refresh token."""
    access_token = _make_access_token(user.id)
    raw_refresh = _make_refresh_token()
    fid = family_id or uuid.uuid4()

    rt = RefreshToken(
        user_id=user.id,
        token_hash=_hash_token(raw_refresh),
        family_id=fid,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_EXPIRES_DAYS),
    )
    db.add(rt)
    await db.flush()
    return access_token, raw_refresh


async def rotate_refresh_token(db: AsyncSession, raw_token: str) -> tuple[User, str, str]:
    """
    Validates and rotates a refresh token.
    Returns (user, new_access_token, new_raw_refresh_token).
    Raises ValueError on invalid/expired/revoked token.
    Revokes entire family on replay (token already revoked).
    """
    token_hash = _hash_token(raw_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    rt = result.scalar_one_or_none()

    if rt is None:
        raise ValueError("Invalid refresh token")

    if rt.is_revoked:
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == rt.family_id)
            .values(is_revoked=True)
        )
        await db.flush()
        raise ValueError("Refresh token reuse detected")

    if rt.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise ValueError("Refresh token expired")

    rt.is_revoked = True
    await db.flush()

    result = await db.execute(select(User).where(User.id == rt.user_id))
    user = result.scalar_one()

    access_token, new_raw_refresh = await create_token_pair(db, user, family_id=rt.family_id)
    return user, access_token, new_raw_refresh


async def revoke_refresh_token(db: AsyncSession, raw_token: str) -> None:
    token_hash = _hash_token(raw_token)
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.token_hash == token_hash)
        .values(is_revoked=True)
    )
    await db.flush()


async def get_user_from_access_token(db: AsyncSession, token: str) -> User:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Invalid token")
    except JWTError:
        raise ValueError("Invalid token")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise ValueError("User not found or inactive")
    return user
