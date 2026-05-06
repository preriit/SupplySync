from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.exc import UnknownHashError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import os
from pathlib import Path
from dotenv import load_dotenv
from models import User
from database import get_db

load_dotenv(Path(__file__).resolve().parent / ".env")

# Support both new bcrypt hashes and migrated Django PBKDF2 hashes.
pwd_context = CryptContext(
    schemes=["bcrypt", "django_pbkdf2_sha256"],
    deprecated="auto",
)
security = HTTPBearer()

JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 43200))


def _is_truthy(value: Optional[str]) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def _get_jwt_secret_key() -> str:
    """Resolve JWT key at call time so late-loaded env vars are honored."""
    configured_key = os.environ.get('JWT_SECRET_KEY')
    if configured_key:
        return configured_key

    app_env = os.environ.get('APP_ENV', 'development').strip().lower()
    if app_env != 'production' and _is_truthy(os.environ.get('ALLOW_INSECURE_DEV_JWT')):
        # Explicit local-only fallback for ad hoc runs without backend/.env.
        return 'dev-insecure-jwt-secret'

    raise RuntimeError('JWT_SECRET_KEY is not configured')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except (ValueError, UnknownHashError):
        return False

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, _get_jwt_secret_key(), algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, _get_jwt_secret_key(), algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user
