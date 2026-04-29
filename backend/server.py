from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
from typing import Optional
import os
import logging
import hashlib
import smtplib
import uuid
from threading import Lock
from pathlib import Path
from email.message import EmailMessage
from dotenv import load_dotenv
from jose import JWTError, jwt

from database import get_db
from models import (
    User, Merchant, Product, SubCategory, MakeType, 
    SurfaceType, ApplicationType, BodyType, Quality, Category, Size, ProductTransaction, ProductActivityLog, ProductImage
)
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from typing import List

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

def get_bool_env(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


APP_ENV = os.environ.get("APP_ENV", "development").strip().lower()
# In production, docs should be explicitly enabled.
ENABLE_API_DOCS = get_bool_env("ENABLE_API_DOCS", APP_ENV != "production")
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
PASSWORD_RESET_EXPIRE_MINUTES = int(os.environ.get("PASSWORD_RESET_EXPIRE_MINUTES", "30"))
FRONTEND_BASE_URL = os.environ.get("FRONTEND_BASE_URL", "http://localhost:3000")
FORGOT_PASSWORD_WINDOW_SECONDS = int(os.environ.get("FORGOT_PASSWORD_WINDOW_SECONDS", "900"))
FORGOT_PASSWORD_MAX_ATTEMPTS = int(os.environ.get("FORGOT_PASSWORD_MAX_ATTEMPTS", "5"))
RESET_PASSWORD_WINDOW_SECONDS = int(os.environ.get("RESET_PASSWORD_WINDOW_SECONDS", "900"))
RESET_PASSWORD_MAX_ATTEMPTS = int(os.environ.get("RESET_PASSWORD_MAX_ATTEMPTS", "10"))
_RATE_LIMIT_BUCKETS = {}
_RATE_LIMIT_LOCK = Lock()

# Create the main app
app = FastAPI(
    title="SupplySync API",
    docs_url="/docs" if ENABLE_API_DOCS else None,
    redoc_url="/redoc" if ENABLE_API_DOCS else None,
    openapi_url="/openapi.json" if ENABLE_API_DOCS else None,
)

# Create API router with /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class RegisterDealerRequest(BaseModel):
    username: str
    email: EmailStr
    phone: str
    password: str
    merchant_name: str
    merchant_email: Optional[str] = None
    merchant_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    gst_number: Optional[str] = None

class SignUpRequest(BaseModel):
    business_name: str
    owner_name: str
    phone: str
    city: str
    state: str
    postal_code: str
    address: Optional[str] = None
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    phone: Optional[str] = None
    user_type: str
    merchant_id: Optional[str] = None
    preferred_language: str


class UpdateProfileRequest(BaseModel):
    username: str
    phone: Optional[str] = None
    preferred_language: Optional[str] = "en"


class TeamMemberCreateRequest(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    user_type: Optional[str] = "staff"


class TeamMemberUpdateRequest(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    user_type: Optional[str] = "staff"
    is_active: Optional[bool] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


READ_ONLY_MERCHANT_USER_TYPES = {"dealer", "manager", "staff"}
INVENTORY_WRITE_USER_TYPES = {"dealer", "manager"}
TEAM_MEMBER_USER_TYPES = {"staff", "manager"}


def require_merchant_read_access(current_user: User) -> None:
    if current_user.user_type not in READ_ONLY_MERCHANT_USER_TYPES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this user type"
        )
    if not current_user.merchant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not linked to a merchant"
        )


def require_inventory_write_access(current_user: User) -> None:
    require_merchant_read_access(current_user)
    if current_user.user_type not in INVENTORY_WRITE_USER_TYPES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealer or manager can modify inventory"
        )


def require_dealer_delete_access(current_user: User) -> None:
    require_merchant_read_access(current_user)
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealer can delete inventory records"
        )


def require_dealer_team_management_access(current_user: User) -> None:
    require_merchant_read_access(current_user)
    if current_user.user_type != "dealer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dealer can manage team members"
        )


def _password_fingerprint(password_hash: str) -> str:
    return hashlib.sha256(password_hash.encode("utf-8")).hexdigest()[:24]


def _team_member_integrity_error_detail(error: IntegrityError) -> str:
    """Map database integrity errors to user-safe validation messages."""
    raw = str(getattr(error, "orig", error)).lower()
    if "users_phone" in raw:
        return "Cannot save: mobile number already exists in another record."
    if "users_username" in raw:
        return "Cannot save: username already exists in another record."
    if "users_email" in raw:
        return "Cannot save: email already exists in another record."
    return "Cannot save due to duplicate data in another record."


def _upsert_member_by_mobile(
    db: Session,
    current_user: User,
    normalized_phone: str,
    normalized_name: str,
    member_email: str,
    requested_type: str,
    password_hash: str
) -> tuple[User, bool]:
    """
    Return (member, created_new) for team-member onboarding.

    Identity is mobile-first: one user identity per mobile number.
    - Active mobile in same merchant => conflict.
    - Active mobile in another merchant => conflict.
    - Inactive mobile => reactivate and reassign same identity.
    """
    existing_phone_user = db.query(User).filter(User.phone == normalized_phone).first()

    if existing_phone_user:
        if existing_phone_user.is_active:
            if existing_phone_user.merchant_id == current_user.merchant_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This mobile number is already active in your team."
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mobile number is already active with another employer. Ask previous employer to deactivate first."
            )

        existing_phone_user.business_name = normalized_name
        existing_phone_user.username = normalized_phone
        existing_phone_user.email = member_email
        existing_phone_user.phone = normalized_phone
        existing_phone_user.password_hash = password_hash
        existing_phone_user.user_type = requested_type
        existing_phone_user.role = requested_type
        existing_phone_user.merchant_id = current_user.merchant_id
        existing_phone_user.is_verified = True
        existing_phone_user.is_active = True
        existing_phone_user.deleted_at = None
        return existing_phone_user, False

    new_member = User(
        business_name=normalized_name,
        username=normalized_phone,
        email=member_email,
        phone=normalized_phone,
        password_hash=password_hash,
        user_type=requested_type,
        merchant_id=current_user.merchant_id,
        role=requested_type,
        is_verified=True,
        is_active=True
    )
    db.add(new_member)
    return new_member, True


def _build_password_reset_token(user: User) -> str:
    if not JWT_SECRET_KEY:
        raise RuntimeError("JWT_SECRET_KEY is not configured")
    expire = datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id),
        "purpose": "password_reset",
        "pwd_sig": _password_fingerprint(user.password_hash),
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def _normalize_team_member_type(user_type: Optional[str]) -> str:
    if user_type is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role is required"
        )
    normalized_type = user_type.strip().lower()
    if normalized_type not in TEAM_MEMBER_USER_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_type must be 'staff' or 'manager'"
        )
    return normalized_type


def _decode_password_reset_token(token: str) -> dict:
    if not JWT_SECRET_KEY:
        raise RuntimeError("JWT_SECRET_KEY is not configured")
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])


def _send_password_reset_email(email: str, reset_url: str) -> bool:
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    smtp_from = os.environ.get("SMTP_FROM", smtp_user or "noreply@supplysync.local")
    smtp_use_tls = get_bool_env("SMTP_USE_TLS", True)

    if not smtp_host or not smtp_user or not smtp_password:
        return False

    message = EmailMessage()
    message["Subject"] = "SupplySync password reset"
    message["From"] = smtp_from
    message["To"] = email
    message.set_content(
        "We received a request to reset your password.\n\n"
        f"Reset link: {reset_url}\n\n"
        f"This link expires in {PASSWORD_RESET_EXPIRE_MINUTES} minutes."
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        if smtp_use_tls:
            server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(message)
    return True


def _is_rate_limited(key: str, max_attempts: int, window_seconds: int) -> bool:
    now_ts = datetime.now(timezone.utc).timestamp()
    window_start = now_ts - window_seconds

    with _RATE_LIMIT_LOCK:
        attempts = _RATE_LIMIT_BUCKETS.get(key, [])
        attempts = [ts for ts in attempts if ts >= window_start]

        if len(attempts) >= max_attempts:
            _RATE_LIMIT_BUCKETS[key] = attempts
            return True

        attempts.append(now_ts)
        _RATE_LIMIT_BUCKETS[key] = attempts
        return False


def _coverage_per_pc_from_mm(width_mm: int, height_mm: int) -> tuple[float, float]:
    sqm = (float(width_mm) * float(height_mm)) / 1_000_000.0
    sqft = sqm * 10.764
    return sqm, sqft


def _normalized_size_token(size_value: str) -> str:
    return (size_value or "").replace('"', "").replace(" ", "").lower()

# Auth Routes
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login endpoint for dealers and subdealers"""
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    if user.user_type in {"staff", "manager"} and not user.merchant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Team member is not linked to a merchant"
        )
    
    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "user_type": user.user_type,
            "merchant_id": str(user.merchant_id) if user.merchant_id else None,
            "preferred_language": user.preferred_language or "en"
        }
    }


@api_router.post("/auth/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    """
    Start password reset flow.
    Always returns a generic success message to prevent user enumeration.
    """
    generic_response = {
        "message": "If an account exists for this email, password reset instructions have been sent."
    }
    client_ip = http_request.client.host if http_request.client else "unknown"
    limit_key = f"forgot:{client_ip}:{request.email.lower()}"
    if _is_rate_limited(limit_key, FORGOT_PASSWORD_MAX_ATTEMPTS, FORGOT_PASSWORD_WINDOW_SECONDS):
        return generic_response

    user = db.query(User).filter(
        User.email == request.email,
        User.deleted_at.is_(None)
    ).first()

    if not user or not user.is_active:
        return generic_response

    try:
        token = _build_password_reset_token(user)
        reset_url = f"{FRONTEND_BASE_URL.rstrip('/')}/reset-password/{token}"
        email_sent = _send_password_reset_email(user.email, reset_url)

        if not email_sent and APP_ENV != "production":
            # Non-production convenience only: surface reset details if SMTP isn't configured.
            return {
                **generic_response,
                "dev_only_reset_url": reset_url,
                "dev_only_reset_token": token,
            }
    except Exception as exc:
        logging.error("forgot-password flow failed for %s: %s", request.email, exc)

    return generic_response


@api_router.post("/auth/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    """Complete password reset using a short-lived signed token."""
    if len(request.new_password or "") < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    client_ip = http_request.client.host if http_request.client else "unknown"
    limit_key = f"reset:{client_ip}"
    if _is_rate_limited(limit_key, RESET_PASSWORD_MAX_ATTEMPTS, RESET_PASSWORD_WINDOW_SECONDS):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many reset attempts. Please try again later."
        )

    try:
        payload = _decode_password_reset_token(request.token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    if payload.get("purpose") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )

    user_id = payload.get("sub")
    token_pwd_sig = payload.get("pwd_sig")
    if not user_id or not token_pwd_sig:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )

    try:
        parsed_user_id = uuid.UUID(str(user_id))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )

    user = db.query(User).filter(User.id == parsed_user_id, User.deleted_at.is_(None)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )

    if token_pwd_sig != _password_fingerprint(user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has already been used or is no longer valid"
        )

    user.password_hash = get_password_hash(request.new_password)
    db.commit()

    return {"message": "Password reset successful. You can now log in with your new password."}

@api_router.post("/auth/signup")
async def signup(request: SignUpRequest, db: Session = Depends(get_db)):
    """Sign up endpoint for new dealers"""
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if phone already exists
    existing_phone = db.query(User).filter(User.phone == request.phone).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    
    try:
        # Create merchant (ID auto-generated by SQLAlchemy)
        merchant = Merchant(
            name=request.business_name,
            email=request.email,
            phone=request.phone,
            city=request.city,
            state=request.state,
            country="India",
            postal_code=request.postal_code,
            address=request.address
        )
        db.add(merchant)
        db.flush()
        
        # Create user (ID auto-generated by SQLAlchemy)
        user = User(
            username=request.owner_name,
            email=request.email,
            phone=request.phone,
            password_hash=get_password_hash(request.password),
            user_type="dealer",
            merchant_id=merchant.id,
            is_active=True
        )
        db.add(user)
        db.commit()
        
        return {
            "message": "Account created successfully",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "merchant_id": str(merchant.id)
            }
        }
        
    except Exception as e:
        db.rollback()
        logging.error(f"Signup error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create account"
        )

@api_router.post("/auth/register/dealer")
async def register_dealer(request: RegisterDealerRequest, db: Session = Depends(get_db)):
    """Register a new dealer account"""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    existing_username = db.query(User).filter(User.username == request.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create merchant first
    merchant = Merchant(
        name=request.merchant_name,
        email=request.merchant_email,
        phone=request.merchant_phone,
        address=request.address,
        city=request.city,
        state=request.state,
        gst_number=request.gst_number
    )
    db.add(merchant)
    db.flush()
    
    # Create user
    hashed_password = get_password_hash(request.password)
    user = User(
        username=request.username,
        email=request.email,
        phone=request.phone,
        password_hash=hashed_password,
        user_type="dealer",
        merchant_id=merchant.id,
        role="admin",
        is_verified=True,  # Auto-verify for dealers
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "user_type": user.user_type,
            "merchant_id": str(user.merchant_id)
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "phone": current_user.phone,
        "user_type": current_user.user_type,
        "merchant_id": str(current_user.merchant_id) if current_user.merchant_id else None,
        "preferred_language": current_user.preferred_language
    }


@api_router.put("/auth/me")
async def update_me(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile fields that are editable in dealer profile UI."""
    normalized_username = (request.username or "").strip()
    if not normalized_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name is required"
        )

    normalized_phone = request.phone.strip() if request.phone else None
    normalized_language = (request.preferred_language or "en").strip().lower()
    if normalized_language not in {"en", "hi"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="preferred_language must be 'en' or 'hi'"
        )

    if db.query(User).filter(User.username == normalized_username, User.id != current_user.id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name is already in use"
        )

    if normalized_phone and db.query(User).filter(User.phone == normalized_phone, User.id != current_user.id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is already in use"
        )

    current_user.username = normalized_username
    current_user.phone = normalized_phone
    current_user.preferred_language = normalized_language

    db.commit()
    db.refresh(current_user)

    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "phone": current_user.phone,
        "user_type": current_user.user_type,
        "merchant_id": str(current_user.merchant_id) if current_user.merchant_id else None,
        "preferred_language": current_user.preferred_language
    }


@api_router.get("/dealer/team-members")
async def get_team_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List team members for the dealer's merchant (staff + manager)."""
    require_dealer_team_management_access(current_user)

    members = db.query(User).filter(
        User.merchant_id == current_user.merchant_id,
        User.user_type.in_(["staff", "manager"]),
        User.deleted_at.is_(None)
    ).order_by(User.created_at.desc()).all()

    return {
        "team_members": [
            {
                "id": str(member.id),
                "name": member.business_name,
                "username": member.username,
                "email": member.email,
                "phone": member.phone,
                "user_type": member.user_type,
                "is_active": member.is_active,
                "created_at": member.created_at.isoformat() if member.created_at else None,
            }
            for member in members
        ]
    }


@api_router.post("/dealer/team-members")
async def create_team_member(
    request: TeamMemberCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a team member and force-link it to dealer's merchant."""
    require_dealer_team_management_access(current_user)

    requested_type = _normalize_team_member_type(request.user_type)

    normalized_phone = request.phone.strip() if request.phone else None
    if not normalized_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number is required"
        )
    normalized_name = request.name.strip() if request.name else ""
    if not normalized_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name is required"
        )

    normalized_email = request.email.lower().strip() if request.email else None

    if normalized_email and db.query(User).filter(User.email == normalized_email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    if not request.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required"
        )

    # Optional email is allowed in UI, but users.email is non-null in DB.
    member_email = normalized_email or f"{normalized_phone}@noemail.local"
    new_member, _created_new = _upsert_member_by_mobile(
        db=db,
        current_user=current_user,
        normalized_phone=normalized_phone,
        normalized_name=normalized_name,
        member_email=member_email,
        requested_type=requested_type,
        password_hash=get_password_hash(request.password),
    )
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_team_member_integrity_error_detail(exc)
        )
    db.refresh(new_member)

    return {
        "message": "Team member created successfully",
        "team_member": {
            "id": str(new_member.id),
            "name": new_member.business_name,
            "username": new_member.username,
            "email": new_member.email,
            "phone": new_member.phone,
            "user_type": new_member.user_type,
            "merchant_id": str(new_member.merchant_id) if new_member.merchant_id else None,
            "is_active": new_member.is_active,
        }
    }


@api_router.put("/dealer/team-members/{member_id}")
async def update_team_member(
    member_id: str,
    request: TeamMemberUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a team member linked to dealer's merchant."""
    require_dealer_team_management_access(current_user)

    requested_type = _normalize_team_member_type(request.user_type)

    normalized_phone = request.phone.strip() if request.phone else ""
    if not normalized_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number is required"
        )
    normalized_name = request.name.strip() if request.name else ""
    if not normalized_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name is required"
        )
    if request.is_active is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status is required"
        )

    normalized_email = request.email.lower().strip() if request.email else None
    try:
        member_uuid = uuid.UUID(member_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid team member id"
        ) from exc

    member = db.query(User).filter(
        User.id == member_uuid,
        User.merchant_id == current_user.merchant_id,
        User.user_type.in_(["staff", "manager"]),
        User.deleted_at.is_(None)
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found"
        )

    if normalized_email and db.query(User).filter(User.email == normalized_email, User.id != member.id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    conflicting_phone_user = db.query(User).filter(
        User.phone == normalized_phone,
        User.id != member.id
    ).first()
    if conflicting_phone_user:
        if conflicting_phone_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mobile number is already active with another staff record."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This mobile number belongs to an inactive staff record. Use Add Team Member to reactivate and reassign it."
        )

    member.username = normalized_phone
    member.business_name = normalized_name
    member.phone = normalized_phone
    member.user_type = requested_type
    member.role = requested_type
    if normalized_email:
        member.email = normalized_email
    if request.is_active is not None:
        member.is_active = request.is_active

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_team_member_integrity_error_detail(exc)
        )
    db.refresh(member)

    return {
        "message": "Team member updated successfully",
        "team_member": {
            "id": str(member.id),
            "name": member.business_name,
            "username": member.username,
            "email": member.email,
            "phone": member.phone,
            "user_type": member.user_type,
            "merchant_id": str(member.merchant_id) if member.merchant_id else None,
            "is_active": member.is_active,
        }
    }


@api_router.post("/dealer/team-members/{member_id}/update")
async def update_team_member_via_post(
    member_id: str,
    request: TeamMemberUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """POST alias for environments where PUT may be blocked."""
    return await update_team_member(member_id, request, current_user, db)

# Dashboard Routes
@api_router.get("/dealer/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics for dealer"""
    require_merchant_read_access(current_user)
    
    merchant_id = current_user.merchant_id
    
    # Total products
    total_products = db.query(func.count(Product.id)).filter(
        Product.merchant_id == merchant_id
    ).scalar()
    
    # Active products
    active_products = db.query(func.count(Product.id)).filter(
        Product.merchant_id == merchant_id,
        Product.is_active == True
    ).scalar()
    
    # Low stock items (quantity < 20)
    low_stock = db.query(func.count(Product.id)).filter(
        Product.merchant_id == merchant_id,
        Product.current_quantity < 20,
        Product.current_quantity > 0
    ).scalar()
    
    # Out of stock items
    out_of_stock = db.query(func.count(Product.id)).filter(
        Product.merchant_id == merchant_id,
        Product.current_quantity == 0
    ).scalar()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    products_updated_today = db.query(func.count(func.distinct(ProductActivityLog.product_id))).filter(
        ProductActivityLog.merchant_id == merchant_id,
        ProductActivityLog.created_at >= today_start,
        ProductActivityLog.created_at < today_end
    ).scalar()

    inventory_transactions_today = db.query(func.count(ProductTransaction.id)).filter(
        ProductTransaction.merchant_id == merchant_id,
        ProductTransaction.created_at >= today_start,
        ProductTransaction.created_at < today_end
    ).scalar()

    # Pick a target sub-category for actionable navigation from dashboard KPIs.
    low_stock_target = db.query(
        Product.sub_category_id.label("subcategory_id"),
        func.count(Product.id).label("product_count")
    ).filter(
        Product.merchant_id == merchant_id,
        Product.is_active == True,
        Product.current_quantity < 20,
        Product.current_quantity > 0
    ).group_by(
        Product.sub_category_id
    ).order_by(
        func.count(Product.id).desc()
    ).first()

    out_of_stock_target = db.query(
        Product.sub_category_id.label("subcategory_id"),
        func.count(Product.id).label("product_count")
    ).filter(
        Product.merchant_id == merchant_id,
        Product.is_active == True,
        Product.current_quantity == 0
    ).group_by(
        Product.sub_category_id
    ).order_by(
        func.count(Product.id).desc()
    ).first()
    
    # Total inventory value - NOTE: Price not implemented yet
    inventory_value = 0  # Will be calculated once pricing is added
    
    # Recent Activity - Get last 5 activities with product details
    recent_activities = db.query(
        ProductActivityLog.activity_type,
        ProductActivityLog.description,
        ProductActivityLog.changes,
        ProductActivityLog.created_at,
        Product.brand,
        Product.name
    ).join(
        Product, 
        ProductActivityLog.product_id == Product.id
    ).filter(
        ProductActivityLog.merchant_id == merchant_id
    ).order_by(
        ProductActivityLog.created_at.desc()
    ).limit(5).all()  # Changed from 10 to 5
    
    # Format recent activities for frontend
    formatted_activities = []
    for activity in recent_activities:
        activity_type, description, changes, created_at, brand, product_name = activity
        
        # Create product display name
        tile_name = f"{brand} {product_name}" if brand and product_name else "Product"
        
        # Create human-readable title with more details
        if activity_type == 'created':
            title = f"Added new product: {tile_name}"
        elif activity_type == 'edited':
            title = f"Updated product: {tile_name}"
        elif activity_type == 'deleted':
            title = f"Deleted product: {tile_name}"
        elif activity_type == 'quantity_add':
            # Extract quantity and values from changes JSON
            if changes:
                quantity = changes.get('quantity_change', 1)
                before = changes.get('from', 0)
                after = changes.get('to', 0)
                title = f"Add {quantity} boxes {tile_name} : {before} → {after}"
            else:
                title = f"Added stock to {tile_name}"
        elif activity_type == 'quantity_subtract':
            # Extract quantity and values from changes JSON
            if changes:
                quantity = changes.get('quantity_change', 1)
                before = changes.get('from', 0)
                after = changes.get('to', 0)
                title = f"Subtract {quantity} boxes {tile_name} : {before} → {after}"
            else:
                title = f"Removed stock from {tile_name}"
        else:
            title = f"{activity_type.title()} {tile_name}"
        
        # Calculate time ago
        time_diff = datetime.now(timezone.utc) - created_at.replace(tzinfo=timezone.utc)
        if time_diff.days > 0:
            if time_diff.days == 1:
                time_ago = "Yesterday"
            elif time_diff.days < 7:
                time_ago = f"{time_diff.days} days ago"
            else:
                time_ago = created_at.strftime("%b %d, %Y")
        elif time_diff.seconds >= 3600:
            hours = time_diff.seconds // 3600
            time_ago = f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif time_diff.seconds >= 60:
            minutes = time_diff.seconds // 60
            time_ago = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            time_ago = "Just now"
        
        formatted_activities.append({
            "title": title,
            "time": time_ago,
            "action": activity_type
        })
    
    return {
        "total_products": total_products or 0,
        "active_products": active_products or 0,
        "low_stock_skus": low_stock or 0,
        "out_of_stock_skus": out_of_stock or 0,
        "products_updated_today": products_updated_today or 0,
        "inventory_transactions_today": inventory_transactions_today or 0,
        "low_stock_target_subcategory_id": str(low_stock_target.subcategory_id) if low_stock_target else None,
        "out_of_stock_target_subcategory_id": str(out_of_stock_target.subcategory_id) if out_of_stock_target else None,
        "inventory_value": float(inventory_value),
        "recent_activity": formatted_activities
    }


@api_router.get("/dealer/products/stock-alerts")
async def get_stock_alert_products(
    stock_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List stock-alert products grouped by sub-category."""
    require_merchant_read_access(current_user)

    normalized_stock_type = (stock_type or "").strip().lower()
    if normalized_stock_type not in {"low", "out"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="stock_type must be 'low' or 'out'"
        )

    products_query = db.query(Product).filter(
        Product.merchant_id == current_user.merchant_id,
        Product.is_active == True
    )
    if normalized_stock_type == "low":
        products_query = products_query.filter(
            Product.current_quantity > 0,
            Product.current_quantity < 20
        )
    else:
        products_query = products_query.filter(Product.current_quantity == 0)

    products = products_query.order_by(Product.current_quantity.asc(), Product.name.asc()).all()
    if not products:
        return {
            "stock_type": normalized_stock_type,
            "total_products": 0,
            "groups": []
        }

    subcategory_ids = {product.sub_category_id for product in products}
    subcategories = db.query(SubCategory).filter(SubCategory.id.in_(subcategory_ids)).all()
    subcategory_map = {str(subcategory.id): subcategory for subcategory in subcategories}

    grouped_products = {}
    for product in products:
        subcategory_id = str(product.sub_category_id)
        subcategory = subcategory_map.get(subcategory_id)
        if subcategory_id not in grouped_products:
            grouped_products[subcategory_id] = {
                "subcategory_id": subcategory_id,
                "subcategory_name": subcategory.name if subcategory else "Unknown Category",
                "size_mm": f"{subcategory.height_mm}mm x {subcategory.width_mm}mm" if subcategory else "",
                "products": []
            }

        grouped_products[subcategory_id]["products"].append({
            "id": str(product.id),
            "name": product.name,
            "brand": product.brand,
            "current_quantity": product.current_quantity,
        })

    groups = list(grouped_products.values())
    groups.sort(key=lambda group: group["subcategory_name"])

    return {
        "stock_type": normalized_stock_type,
        "total_products": len(products),
        "groups": groups
    }

# Sub-Categories Routes
@api_router.get("/dealer/subcategories")
async def get_subcategories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all sub-categories with product counts"""
    require_merchant_read_access(current_user)
    
    # Get tiles category
    tiles_category = db.query(Category).filter(Category.slug == "tiles").first()
    if not tiles_category:
        return {"subcategories": []}
    
    # Get all sub-categories with stats
    subcategories = db.query(SubCategory).filter(
        SubCategory.category_id == tiles_category.id,
        SubCategory.is_active == True
    ).all()
    
    result = []
    for subcat in subcategories:
        # Get make type name
        make_type = db.query(MakeType).filter(MakeType.id == subcat.make_type_id).first()
        
        # Count products in this sub-category (for this merchant)
        product_count = db.query(func.count(Product.id)).filter(
            Product.sub_category_id == subcat.id,
            Product.merchant_id == current_user.merchant_id,
            Product.is_active == True
        ).scalar()
        
        # Total quantity across all products
        total_quantity = db.query(func.sum(Product.current_quantity)).filter(
            Product.sub_category_id == subcat.id,
            Product.merchant_id == current_user.merchant_id,
            Product.is_active == True
        ).scalar() or 0
        
        result.append({
            "id": str(subcat.id),
            "name": subcat.name,
            "size": subcat.size,
            "size_display": f"{subcat.height_inches}\" x {subcat.width_inches}\"",
            "size_mm": f"{subcat.height_mm}mm x {subcat.width_mm}mm",
            "make_type": make_type.name if make_type else "",
            "product_count": product_count or 0,
            "total_quantity": int(total_quantity)
        })
    
    # Sort by name
    result.sort(key=lambda x: x['name'])
    
    return {"subcategories": result}

@api_router.get("/dealer/subcategories/{subcategory_id}/products")
async def get_products_in_subcategory(
    subcategory_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all products in a sub-category for this merchant"""
    require_merchant_read_access(current_user)
    
    # Get sub-category info
    subcat = db.query(SubCategory).filter(SubCategory.id == subcategory_id).first()
    if not subcat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sub-category not found"
        )
    
    # Get make type
    make_type = db.query(MakeType).filter(MakeType.id == subcat.make_type_id).first()
    
    # Get products for this merchant in this sub-category
    products = db.query(Product).filter(
        Product.sub_category_id == subcategory_id,
        Product.merchant_id == current_user.merchant_id,
        Product.is_active == True
    ).all()
    
    product_list = []
    for product in products:
        # Get reference data names
        surface_type = db.query(SurfaceType).filter(SurfaceType.id == product.surface_type_id).first()
        application_type = db.query(ApplicationType).filter(ApplicationType.id == product.application_type_id).first()
        body_type = db.query(BodyType).filter(BodyType.id == product.body_type_id).first()
        quality = db.query(Quality).filter(Quality.id == product.quality_id).first()
        
        product_list.append({
            "id": str(product.id),
            "brand": product.brand,
            "name": product.name,
            "sku": product.sku,
            "surface_type": surface_type.name if surface_type else "",
            "application_type": application_type.name if application_type else "",
            "body_type": body_type.name if body_type else "",
            "quality": quality.name if quality else "",
            "current_quantity": product.current_quantity,
            "packing_per_box": product.packing_per_box,
            "coverage_per_pc_sqm": product.coverage_per_pc_sqm,
            "coverage_per_pc_sqft": product.coverage_per_pc_sqft,
            "coverage_per_box_sqm": product.coverage_per_box_sqm,
            "coverage_per_box_sqft": product.coverage_per_box_sqft,
            "primary_image_url": product.primary_image_url
        })
    
    return {
        "subcategory": {
            "id": str(subcat.id),
            "name": subcat.name,
            "size": subcat.size,
            "size_display": f"{subcat.height_inches}\" x {subcat.width_inches}\"",
            "size_mm": f"{subcat.height_mm}mm x {subcat.width_mm}mm",
            "coverage_per_pc_sqm": subcat.coverage_per_pc_sqm,
            "coverage_per_pc_sqft": subcat.coverage_per_pc_sqft,
            "make_type": make_type.name if make_type else ""
        },
        "products": product_list
    }


@api_router.delete("/dealer/subcategories/{subcategory_id}")
async def soft_delete_subcategory(
    subcategory_id: str,
    delete_products: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soft delete a sub-category and optionally soft delete related products."""
    require_inventory_write_access(current_user)

    subcat = db.query(SubCategory).filter(
        SubCategory.id == subcategory_id,
        SubCategory.is_active == True
    ).first()
    if not subcat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sub-category not found or already deleted"
        )

    merchant_active_products_query = db.query(Product).filter(
        Product.sub_category_id == subcategory_id,
        Product.merchant_id == current_user.merchant_id,
        Product.is_active == True
    )
    merchant_active_products_count = merchant_active_products_query.count()

    # Guardrail: never leave active products behind under a deleted category.
    if merchant_active_products_count > 0 and not delete_products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This sub-category has {merchant_active_products_count} active product(s). Confirm product deletion to continue."
        )

    deleted_products_count = 0
    if delete_products:
        deleted_products_count = merchant_active_products_query.update(
            {"is_active": False},
            synchronize_session=False
        )

    remaining_active_products_count = db.query(func.count(Product.id)).filter(
        Product.sub_category_id == subcategory_id,
        Product.is_active == True
    ).scalar() or 0
    if remaining_active_products_count > 0:
        db.commit()
        return {
            "message": "Products were updated, but sub-category remains active because other active products still reference it.",
            "subcategory_id": str(subcat.id),
            "deleted_products_count": int(deleted_products_count),
            "subcategory_deleted": False,
        }

    subcat.is_active = False
    db.commit()

    return {
        "message": "Sub-category deleted successfully",
        "subcategory_id": str(subcat.id),
        "deleted_products_count": int(deleted_products_count),
        "subcategory_deleted": True,
    }

@api_router.post("/dealer/products")
async def create_product(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new product"""
    require_inventory_write_access(current_user)
    
    # Validate required fields
    required_fields = ['sub_category_id', 'brand', 'name', 'surface_type_id', 
                       'application_type_id', 'body_type_id', 'quality_id',
                       'current_quantity', 'packing_per_box']
    
    for field in required_fields:
        if field not in request or request[field] is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Field '{field}' is required"
            )
    
    # Check for duplicate product name within same sub-category for this merchant
    existing = db.query(Product).filter(
        Product.merchant_id == current_user.merchant_id,
        Product.sub_category_id == request['sub_category_id'],
        Product.brand == request['brand'],
        Product.name == request['name']
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product '{request['brand']} {request['name']}' already exists in this category"
        )
    
    subcat = db.query(SubCategory).filter(SubCategory.id == request['sub_category_id']).first()
    if not subcat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid sub_category_id"
        )

    cov_sqm = subcat.coverage_per_pc_sqm
    cov_sqft = subcat.coverage_per_pc_sqft
    if cov_sqm is None or cov_sqft is None:
        cov_sqm, cov_sqft = _coverage_per_pc_from_mm(subcat.width_mm, subcat.height_mm)
    box_cov_sqm = float(cov_sqm) * float(request['packing_per_box'])
    box_cov_sqft = float(cov_sqft) * float(request['packing_per_box'])

    # Create product
    new_product = Product(
        merchant_id=current_user.merchant_id,
        sub_category_id=request['sub_category_id'],
        brand=request['brand'],
        name=request['name'],
        sku=request.get('sku'),
        surface_type_id=request['surface_type_id'],
        application_type_id=request['application_type_id'],
        body_type_id=request['body_type_id'],
        quality_id=request['quality_id'],
        current_quantity=request['current_quantity'],
        packing_per_box=request['packing_per_box'],
        coverage_per_pc_sqm=cov_sqm,
        coverage_per_pc_sqft=cov_sqft,
        coverage_per_box_sqm=box_cov_sqm,
        coverage_per_box_sqft=box_cov_sqft,
        primary_image_url=request.get('primary_image_url'),
        is_active=True
    )
    
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    
    # Log product creation activity
    log_product_activity(
        db=db,
        product_id=str(new_product.id),
        merchant_id=str(current_user.merchant_id),
        user_id=str(current_user.id),
        activity_type='created',
        description=f"Product created: {new_product.brand} {new_product.name}"
    )
    db.commit()
    
    return {
        "message": f"Product '{request['brand']} {request['name']}' created successfully",
        "product": {
            "id": str(new_product.id),
            "brand": new_product.brand,
            "name": new_product.name,
            "quantity": new_product.current_quantity
        }
    }

@api_router.get("/dealer/products/{product_id}")
async def get_product_detail(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific product"""
    require_merchant_read_access(current_user)
    
    # Get product with all related data
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Get related entities
    sub_category = db.query(SubCategory).filter(SubCategory.id == product.sub_category_id).first()
    surface_type = db.query(SurfaceType).filter(SurfaceType.id == product.surface_type_id).first()
    application_type = db.query(ApplicationType).filter(ApplicationType.id == product.application_type_id).first()
    body_type = db.query(BodyType).filter(BodyType.id == product.body_type_id).first()
    quality = db.query(Quality).filter(Quality.id == product.quality_id).first()
    
    return {
        "product": {
            "id": str(product.id),
            "sub_category_id": str(product.sub_category_id),
            "sub_category_name": sub_category.name if sub_category else "",
            "brand": product.brand,
            "name": product.name,
            "sku": product.sku,
            "surface_type_id": str(product.surface_type_id),
            "surface_type": surface_type.name if surface_type else "",
            "application_type_id": str(product.application_type_id),
            "application_type": application_type.name if application_type else "",
            "body_type_id": str(product.body_type_id),
            "body_type": body_type.name if body_type else "",
            "quality_id": str(product.quality_id),
            "quality": quality.name if quality else "",
            "current_quantity": product.current_quantity,
            "packing_per_box": product.packing_per_box,
            "coverage_per_pc_sqm": product.coverage_per_pc_sqm,
            "coverage_per_pc_sqft": product.coverage_per_pc_sqft,
            "coverage_per_box_sqm": product.coverage_per_box_sqm,
            "coverage_per_box_sqft": product.coverage_per_box_sqft,
            "primary_image_url": product.primary_image_url,
            "is_active": product.is_active,
            "created_at": product.created_at.isoformat() if product.created_at else None,
            "updated_at": product.updated_at.isoformat() if product.updated_at else None
        }
    }

@api_router.put("/dealer/products/{product_id}")
async def update_product(
    product_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing product"""
    require_inventory_write_access(current_user)
    
    # Get product
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Track changes for activity log
    changes_made = []
    
    # Helper function to get name from ID
    def get_name_by_id(model, id_value):
        if not id_value:
            return None
        obj = db.query(model).filter(model.id == id_value).first()
        return obj.name if obj else str(id_value)
    
    # Update fields and track changes with human-readable names
    if 'brand' in request and request['brand'] != product.brand:
        changes_made.append({"field": "brand", "old_value": product.brand, "new_value": request['brand']})
        product.brand = request['brand']
    
    if 'name' in request and request['name'] != product.name:
        changes_made.append({"field": "name", "old_value": product.name, "new_value": request['name']})
        product.name = request['name']
    
    if 'sku' in request and request['sku'] != product.sku:
        changes_made.append({"field": "sku", "old_value": product.sku or "Not set", "new_value": request['sku'] or "Not set"})
        product.sku = request['sku']
    
    if 'surface_type_id' in request and request['surface_type_id'] != str(product.surface_type_id):
        old_name = get_name_by_id(SurfaceType, product.surface_type_id)
        new_name = get_name_by_id(SurfaceType, request['surface_type_id'])
        changes_made.append({"field": "surface_type", "old_value": old_name, "new_value": new_name})
        product.surface_type_id = request['surface_type_id']
    
    if 'application_type_id' in request and request['application_type_id'] != str(product.application_type_id):
        old_name = get_name_by_id(ApplicationType, product.application_type_id)
        new_name = get_name_by_id(ApplicationType, request['application_type_id'])
        changes_made.append({"field": "application_type", "old_value": old_name, "new_value": new_name})
        product.application_type_id = request['application_type_id']
    
    if 'body_type_id' in request and request['body_type_id'] != str(product.body_type_id):
        old_name = get_name_by_id(BodyType, product.body_type_id)
        new_name = get_name_by_id(BodyType, request['body_type_id'])
        changes_made.append({"field": "body_type", "old_value": old_name, "new_value": new_name})
        product.body_type_id = request['body_type_id']
    
    if 'quality_id' in request and request['quality_id'] != str(product.quality_id):
        old_name = get_name_by_id(Quality, product.quality_id)
        new_name = get_name_by_id(Quality, request['quality_id'])
        changes_made.append({"field": "quality", "old_value": old_name, "new_value": new_name})
        product.quality_id = request['quality_id']
    
    if 'packing_per_box' in request and request['packing_per_box'] != product.packing_per_box:
        changes_made.append({"field": "packing_per_box", "old_value": f"{product.packing_per_box} pieces", "new_value": f"{request['packing_per_box']} pieces"})
        product.packing_per_box = request['packing_per_box']
    
    # Keep product coverage in sync with subcategory dimensions and packing.
    subcat = db.query(SubCategory).filter(SubCategory.id == product.sub_category_id).first()
    if subcat:
        cov_sqm = subcat.coverage_per_pc_sqm
        cov_sqft = subcat.coverage_per_pc_sqft
        if cov_sqm is None or cov_sqft is None:
            cov_sqm, cov_sqft = _coverage_per_pc_from_mm(subcat.width_mm, subcat.height_mm)
        product.coverage_per_pc_sqm = cov_sqm
        product.coverage_per_pc_sqft = cov_sqft
        product.coverage_per_box_sqm = float(cov_sqm) * float(product.packing_per_box)
        product.coverage_per_box_sqft = float(cov_sqft) * float(product.packing_per_box)

    # Update timestamp
    from datetime import datetime, timezone
    product.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(product)
    
    # Log activity if changes were made
    if changes_made:
        log_product_activity(
            db=db,
            product_id=str(product.id),
            merchant_id=str(current_user.merchant_id),
            user_id=str(current_user.id),
            activity_type='edited',
            changes={"fields_changed": changes_made},
            description=f"Product edited: {len(changes_made)} field(s) updated"
        )
        db.commit()
    
    return {
        "message": "Product updated successfully",
        "product": {
            "id": str(product.id),
            "brand": product.brand,
            "name": product.name,
            "current_quantity": product.current_quantity
        }
    }

@api_router.delete("/dealer/products/{product_id}")
async def delete_product(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a product (soft delete by setting is_active to False)"""
    require_dealer_delete_access(current_user)
    
    # Get product
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Soft delete + activity log (single source of truth for delete behavior).
    product.is_active = False
    from datetime import datetime, timezone
    product.updated_at = datetime.now(timezone.utc)

    log_product_activity(
        db=db,
        product_id=str(product.id),
        merchant_id=str(current_user.merchant_id),
        user_id=str(current_user.id),
        activity_type='deleted',
        description=f"Product deleted: {product.brand} {product.name}"
    )
    db.commit()
    
    return {
        "message": f"Product '{product.brand} {product.name}' deleted successfully"
    }


@api_router.post("/dealer/products/bulk-delete")
async def bulk_delete_products(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soft delete multiple products in one request."""
    require_dealer_delete_access(current_user)

    product_ids = request.get("product_ids") or []
    if not isinstance(product_ids, list) or len(product_ids) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="product_ids must be a non-empty list"
        )

    products = db.query(Product).filter(
        Product.id.in_(product_ids),
        Product.merchant_id == current_user.merchant_id,
        Product.is_active == True
    ).all()

    if not products:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No matching active products found for deletion"
        )

    deleted_names = []
    from datetime import datetime, timezone
    for product in products:
        product.is_active = False
        product.updated_at = datetime.now(timezone.utc)
        deleted_names.append(f"{product.brand} {product.name}")
        log_product_activity(
            db=db,
            product_id=str(product.id),
            merchant_id=str(current_user.merchant_id),
            user_id=str(current_user.id),
            activity_type='deleted',
            description=f"Product deleted: {product.brand} {product.name}"
        )

    db.commit()

    return {
        "message": f"{len(products)} product(s) deleted successfully",
        "deleted_count": len(products),
        "deleted_products": deleted_names,
    }

# Product Transactions Routes
@api_router.post("/dealer/products/{product_id}/transactions")
async def create_product_transaction(
    product_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new product transaction (add or subtract quantity)"""
    require_inventory_write_access(current_user)
    
    # Validate request
    transaction_type = request.get('transaction_type')
    quantity = request.get('quantity')
    
    if not transaction_type or transaction_type not in ['add', 'subtract']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="transaction_type must be 'add' or 'subtract'"
        )
    
    if not quantity or not isinstance(quantity, int) or quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="quantity must be a positive integer"
        )
    
    # Get product
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Calculate new quantity
    quantity_before = product.current_quantity
    if transaction_type == 'add':
        quantity_after = quantity_before + quantity
    else:  # subtract
        quantity_after = quantity_before - quantity
    
    # Create transaction record
    transaction = ProductTransaction(
        product_id=product.id,
        merchant_id=current_user.merchant_id,
        user_id=current_user.id,
        transaction_type=transaction_type,
        quantity=quantity,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        notes=request.get('notes')
    )
    
    # Update product quantity
    product.current_quantity = quantity_after
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    db.refresh(product)
    
    # Log activity
    log_product_activity(
        db=db,
        product_id=str(product.id),
        merchant_id=str(current_user.merchant_id),
        user_id=str(current_user.id),
        activity_type='quantity_add' if transaction_type == 'add' else 'quantity_subtract',
        changes={"quantity_change": quantity if transaction_type == 'add' else -quantity, "from": quantity_before, "to": quantity_after},
        description=f"{transaction_type.capitalize()} {quantity} boxes: {quantity_before} → {quantity_after}"
    )
    db.commit()
    
    return {
        "message": f"Transaction successful: {transaction_type} {quantity} boxes",
        "transaction": {
            "id": str(transaction.id),
            "type": transaction.transaction_type,
            "quantity": transaction.quantity,
            "quantity_before": transaction.quantity_before,
            "quantity_after": transaction.quantity_after,
            "created_at": transaction.created_at.isoformat()
        },
        "product": {
            "id": str(product.id),
            "current_quantity": product.current_quantity
        }
    }

@api_router.get("/dealer/products/{product_id}/transactions")
async def get_product_transactions(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get transaction history for a product"""
    require_merchant_read_access(current_user)
    
    # Verify product belongs to merchant
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Get transactions
    transactions = db.query(ProductTransaction).filter(
        ProductTransaction.product_id == product_id
    ).order_by(ProductTransaction.created_at.desc()).limit(limit).all()
    
    transaction_list = []
    for txn in transactions:
        # Get user who made the transaction
        user = db.query(User).filter(User.id == txn.user_id).first()
        
        transaction_list.append({
            "id": str(txn.id),
            "transaction_type": txn.transaction_type,
            "quantity": txn.quantity,
            "quantity_before": txn.quantity_before,
            "quantity_after": txn.quantity_after,
            "notes": txn.notes,
            "created_at": txn.created_at.isoformat(),
            "created_by": user.username if user else "Unknown"
        })
    
    return {
        "product": {
            "id": str(product.id),
            "brand": product.brand,
            "name": product.name,
            "current_quantity": product.current_quantity
        },
        "transactions": transaction_list,
        "total_count": len(transaction_list)
    }

@api_router.get("/dealer/products/{product_id}/activity-log")
async def get_product_activity_log(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 100
):
    """Get complete activity log for a product (all changes)"""
    require_merchant_read_access(current_user)
    
    # Verify product belongs to merchant
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Get activity log
    activities = db.query(ProductActivityLog).filter(
        ProductActivityLog.product_id == product_id
    ).order_by(ProductActivityLog.created_at.desc()).limit(limit).all()
    
    activity_list = []
    for activity in activities:
        # Get user who performed the action
        user = db.query(User).filter(User.id == activity.user_id).first()
        
        activity_list.append({
            "id": str(activity.id),
            "activity_type": activity.activity_type,
            "changes": activity.changes,
            "description": activity.description,
            "created_at": activity.created_at.isoformat(),
            "created_by": user.username if user else "Unknown"
        })
    
    return {
        "product": {
            "id": str(product.id),
            "brand": product.brand,
            "name": product.name,
            "current_quantity": product.current_quantity
        },
        "activities": activity_list,
        "total_count": len(activity_list)
    }


@api_router.post("/dealer/subcategories")
async def create_subcategory(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or get existing sub-category (smart checking)"""
    require_inventory_write_access(current_user)
    
    size = request.get('size')
    make_type_id = request.get('make_type_id')
    
    if not size or not make_type_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Size and make_type_id are required"
        )
    
    # Get tiles category
    tiles_category = db.query(Category).filter(Category.slug == "tiles").first()
    if not tiles_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tiles category not found"
        )
    
    # Get make type
    make_type = db.query(MakeType).filter(MakeType.id == make_type_id).first()
    if not make_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Make type not found"
        )
    
    # Parse size (e.g., "12x12" -> height=12, width=12)
    try:
        parts = size.lower().replace('"', '').replace(' ', '').split('x')
        height_inches = int(parts[0])
        width_inches = int(parts[1])
        height_mm = int(height_inches * 25.4)
        width_mm = int(width_inches * 25.4)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid size format. Use format like '12x12'"
        )

    # Try to link with admin-managed size reference for authoritative dimensions/coverage.
    normalized_size = _normalized_size_token(size)
    size_ref = db.query(Size).filter(Size.is_active == True).all()
    matched_size = None
    for candidate in size_ref:
        candidate_norm = _normalized_size_token(candidate.name)
        if candidate_norm == normalized_size:
            matched_size = candidate
            break
        if candidate.height_inches == height_inches and candidate.width_inches == width_inches:
            matched_size = candidate
            break

    if matched_size:
        height_inches = matched_size.height_inches
        width_inches = matched_size.width_inches
        height_mm = matched_size.height_mm
        width_mm = matched_size.width_mm
        cov_sqm = matched_size.coverage_per_pc_sqm
        cov_sqft = matched_size.coverage_per_pc_sqft
        if cov_sqm is None or cov_sqft is None:
            cov_sqm, cov_sqft = _coverage_per_pc_from_mm(width_mm, height_mm)
    else:
        cov_sqm, cov_sqft = _coverage_per_pc_from_mm(width_mm, height_mm)
    
    # Check if sub-category already exists
    existing = db.query(SubCategory).filter(
        SubCategory.category_id == tiles_category.id,
        SubCategory.size == size,
        SubCategory.make_type_id == make_type_id
    ).first()
    
    if existing:
        if matched_size and existing.size_id != matched_size.id:
            existing.size_id = matched_size.id
        if existing.coverage_per_pc_sqm is None or existing.coverage_per_pc_sqft is None:
            existing.coverage_per_pc_sqm = cov_sqm
            existing.coverage_per_pc_sqft = cov_sqft
        db.commit()
        return {
            "exists": True,
            "message": f"Sub-category '{existing.name}' already exists",
            "subcategory": {
                "id": str(existing.id),
                "name": existing.name,
                "size": existing.size,
                "make_type": make_type.name
            }
        }
    
    # Create new sub-category
    name = f"{size.upper()} {make_type.name.upper()}"
    
    new_subcat = SubCategory(
        category_id=tiles_category.id,
        name=name,
        size=size,
        height_inches=height_inches,
        width_inches=width_inches,
        height_mm=height_mm,
        width_mm=width_mm,
        size_id=matched_size.id if matched_size else None,
        coverage_per_pc_sqm=cov_sqm,
        coverage_per_pc_sqft=cov_sqft,
        make_type_id=make_type_id,
        default_packing_per_box=10
    )
    
    db.add(new_subcat)
    db.commit()
    db.refresh(new_subcat)
    
    return {
        "exists": False,
        "message": f"Sub-category '{name}' created successfully",
        "subcategory": {
            "id": str(new_subcat.id),
            "name": new_subcat.name,
            "size": new_subcat.size,
            "make_type": make_type.name
        }
    }

# Reference Data Routes
@api_router.get("/reference/tile-sizes")
async def get_tile_sizes(db: Session = Depends(get_db)):
    """Get tile sizes from database (admin-managed)"""
    sizes = db.query(Size).filter(Size.is_active == True).order_by(Size.display_order).all()
    return {
        "sizes": [
            {
                "value": size.name,
                "label": f"{size.name} ({size.height_mm}x{size.width_mm}mm)",
                "height_inches": size.height_inches,
                "width_inches": size.width_inches,
                "height_mm": size.height_mm,
                "width_mm": size.width_mm,
                "coverage_per_pc_sqm": size.coverage_per_pc_sqm,
                "coverage_per_pc_sqft": size.coverage_per_pc_sqft
            }
            for size in sizes
        ]
    }

@api_router.get("/reference/make-types")
async def get_make_types(db: Session = Depends(get_db)):
    """Get all make types"""
    make_types = db.query(MakeType).filter(MakeType.is_active == True).order_by(MakeType.display_order).all()
    return {
        "make_types": [
            {"id": str(mt.id), "name": mt.name}
            for mt in make_types
        ]
    }

@api_router.get("/reference/surface-types")
async def get_surface_types(db: Session = Depends(get_db)):
    """Get all surface types"""
    surface_types = db.query(SurfaceType).filter(SurfaceType.is_active == True).order_by(SurfaceType.display_order).all()
    return {
        "surface_types": [
            {"id": str(st.id), "name": st.name}
            for st in surface_types
        ]
    }

@api_router.get("/reference/application-types")
async def get_application_types(db: Session = Depends(get_db)):
    """Get all application types"""
    app_types = db.query(ApplicationType).filter(ApplicationType.is_active == True).order_by(ApplicationType.display_order).all()
    return {
        "application_types": [
            {"id": str(at.id), "name": at.name}
            for at in app_types
        ]
    }

@api_router.get("/reference/body-types")
async def get_body_types(db: Session = Depends(get_db)):
    """Get all body types"""
    body_types = db.query(BodyType).filter(BodyType.is_active == True).order_by(BodyType.display_order).all()
    return {
        "body_types": [
            {"id": str(bt.id), "name": bt.name}
            for bt in body_types
        ]
    }

@api_router.get("/reference/qualities")
async def get_qualities(db: Session = Depends(get_db)):
    """Get all qualities"""
    qualities = db.query(Quality).filter(Quality.is_active == True).order_by(Quality.display_order).all()
    return {
        "qualities": [
            {"id": str(q.id), "name": q.name}
            for q in qualities
        ]
    }

# Universal Search Route
@api_router.get("/dealer/search")
async def universal_search(
    q: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Universal search across sub-categories and products"""
    require_merchant_read_access(current_user)
    
    if not q or len(q.strip()) < 2:
        return {
            "subcategories": [],
            "products": [],
            "total_results": 0
        }
    
    query = q.lower().strip()
    
    # Search sub-categories
    tiles_category = db.query(Category).filter(Category.slug == "tiles").first()
    subcategories_results = []
    
    if tiles_category:
        subcats = db.query(SubCategory).filter(
            SubCategory.category_id == tiles_category.id,
            SubCategory.is_active == True
        ).all()
        
        for subcat in subcats:
            make_type = db.query(MakeType).filter(MakeType.id == subcat.make_type_id).first()
            
            # Check if query matches
            if (query in subcat.name.lower() or 
                query in subcat.size.lower() or
                query in f"{subcat.height_mm}".lower() or
                query in f"{subcat.width_mm}".lower() or
                (make_type and query in make_type.name.lower())):
                
                # Count products for this merchant
                product_count = db.query(func.count(Product.id)).filter(
                    Product.sub_category_id == subcat.id,
                    Product.merchant_id == current_user.merchant_id,
                    Product.is_active == True
                ).scalar()
                
                subcategories_results.append({
                    "id": str(subcat.id),
                    "name": subcat.name,
                    "size": subcat.size,
                    "size_display": f"{subcat.height_inches}\" x {subcat.width_inches}\"",
                    "make_type": make_type.name if make_type else "",
                    "product_count": product_count or 0,
                    "type": "subcategory"
                })
    
    # Search products (only this merchant's products)
    products = db.query(Product).filter(
        Product.merchant_id == current_user.merchant_id,
        Product.is_active == True
    ).all()
    
    products_results = []
    for product in products:
        # Get related data
        surface_type = db.query(SurfaceType).filter(SurfaceType.id == product.surface_type_id).first()
        quality = db.query(Quality).filter(Quality.id == product.quality_id).first()
        subcat = db.query(SubCategory).filter(SubCategory.id == product.sub_category_id).first()
        
        # Check if query matches
        if (query in product.brand.lower() or
            query in product.name.lower() or
            (product.sku and query in product.sku.lower()) or
            (surface_type and query in surface_type.name.lower()) or
            (quality and query in quality.name.lower())):
            
            products_results.append({
                "id": str(product.id),
                "brand": product.brand,
                "name": product.name,
                "sku": product.sku,
                "surface_type": surface_type.name if surface_type else "",
                "quality": quality.name if quality else "",
                "current_quantity": product.current_quantity,
                "subcategory_id": str(product.sub_category_id),
                "subcategory_name": subcat.name if subcat else "",
                "type": "product"
            })
    
    return {
        "subcategories": subcategories_results[:10],  # Limit to 10
        "products": products_results[:10],  # Limit to 10
        "total_results": len(subcategories_results) + len(products_results)
    }

# Health check
@api_router.get("/")
async def root():
    return {"message": "SupplySync API is running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
# IMAGE UPLOAD ENDPOINTS
# =====================================================

import cloudinary
import cloudinary.uploader
from fastapi import UploadFile, File
from colorthief import ColorThief
from PIL import Image
import io
import tempfile

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET')
)

def rgb_to_hex(rgb):
    """Convert RGB tuple to hex color"""
    return '#{:02x}{:02x}{:02x}'.format(rgb[0], rgb[1], rgb[2])

def extract_colors_from_image(image_bytes):
    """Extract dominant colors from image using ColorThief"""
    try:
        # Save to temporary file for ColorThief
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            tmp_file.write(image_bytes)
            tmp_file.flush()
            
            # Extract colors
            color_thief = ColorThief(tmp_file.name)
            
            # Get dominant color
            dominant_color = color_thief.get_color(quality=1)
            
            # Get color palette (top 5 colors)
            palette = color_thief.get_palette(color_count=5, quality=1)
            
            # Convert to hex
            dominant_hex = rgb_to_hex(dominant_color)
            palette_hex = [rgb_to_hex(color) for color in palette]
            
            # Clean up temp file
            os.unlink(tmp_file.name)
            
            return {
                "dominant_color": dominant_hex,
                "color_palette": palette_hex
            }
    except Exception as e:
        logging.error(f"Color extraction error: {str(e)}")
        return {
            "dominant_color": None,
            "color_palette": []
        }

class ImageUploadResponse(BaseModel):
    id: str
    image_url: str
    is_primary: bool
    ordering: int
    dominant_color: Optional[str] = None
    color_palette: Optional[List[str]] = None

@api_router.post("/dealer/products/{product_id}/images/upload", response_model=List[ImageUploadResponse])
async def upload_product_images(
    product_id: str,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload one or more images for a product with automatic color extraction"""
    require_inventory_write_access(current_user)

    # Verify product exists and belongs to user's merchant
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get current max ordering
    max_ordering = db.query(func.max(ProductImage.ordering)).filter(
        ProductImage.product_id == product_id
    ).scalar() or 0
    
    uploaded_images = []
    
    for idx, file in enumerate(files):
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail=f"File {file.filename} is not an image")
        
        # Read file content
        image_bytes = await file.read()
        
        # Get image dimensions using PIL
        img = Image.open(io.BytesIO(image_bytes))
        width, height = img.size
        file_format = img.format.lower() if img.format else 'unknown'
        
        # Upload to Cloudinary
        try:
            upload_result = cloudinary.uploader.upload(
                image_bytes,
                folder="supplysync/products",
                resource_type="image"
            )
            
            # Extract colors
            colors = extract_colors_from_image(image_bytes)
            
            # Create database record
            new_image = ProductImage(
                product_id=product_id,
                image_url=upload_result['secure_url'],
                public_url=upload_result['secure_url'],
                cloudinary_public_id=upload_result['public_id'],
                storage_type='cloudinary',
                is_primary=False,  # Will be set by trigger if first image
                ordering=max_ordering + idx + 1,
                file_size_bytes=len(image_bytes),
                width_px=width,
                height_px=height,
                format=file_format,
                color_palette=colors['color_palette'],
                dominant_color=colors['dominant_color'],
                uploaded_by=current_user.id
            )
            
            db.add(new_image)
            db.flush()  # Get the ID
            
            uploaded_images.append({
                "id": str(new_image.id),
                "image_url": new_image.image_url,
                "is_primary": new_image.is_primary,
                "ordering": new_image.ordering,
                "dominant_color": new_image.dominant_color,
                "color_palette": new_image.color_palette
            })
            
        except Exception as e:
            logging.error(f"Upload error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to upload {file.filename}: {str(e)}")
    
    db.commit()
    
    # Log activity
    log_product_activity(
        db=db,
        product_id=product_id,
        user_id=current_user.id,
        merchant_id=current_user.merchant_id,
        activity_type='images_uploaded',
        description=f"Uploaded {len(files)} image(s)",
        changes={"image_count": len(files)}
    )
    
    return uploaded_images

@api_router.get("/dealer/products/{product_id}/images")
async def get_product_images(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all images for a product"""
    require_merchant_read_access(current_user)

    # Verify product exists and belongs to user's merchant
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    images = db.query(ProductImage).filter(
        ProductImage.product_id == product_id
    ).order_by(ProductImage.ordering).all()
    
    return [{
        "id": str(img.id),
        "image_url": img.image_url,
        "is_primary": img.is_primary,
        "ordering": img.ordering,
        "storage_type": img.storage_type,
        "dominant_color": img.dominant_color,
        "color_palette": img.color_palette,
        "width_px": img.width_px,
        "height_px": img.height_px,
        "created_at": img.created_at.isoformat() if img.created_at else None
    } for img in images]

@api_router.put("/dealer/products/{product_id}/images/{image_id}/primary")
async def set_primary_image(
    product_id: str,
    image_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set an image as the primary image for a product"""
    require_inventory_write_access(current_user)

    # Verify product and image
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    image = db.query(ProductImage).filter(
        ProductImage.id == image_id,
        ProductImage.product_id == product_id
    ).first()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Set as primary (trigger will unset others)
    image.is_primary = True
    db.commit()
    
    # Log activity
    log_product_activity(
        db=db,
        product_id=product_id,
        user_id=current_user.id,
        merchant_id=current_user.merchant_id,
        activity_type='primary_image_changed',
        description=f"Set primary image",
        changes={"image_id": str(image_id)}
    )
    
    return {"message": "Primary image updated successfully"}

@api_router.delete("/dealer/products/{product_id}/images/{image_id}")
async def delete_product_image(
    product_id: str,
    image_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a product image"""
    require_dealer_delete_access(current_user)

    # Verify product and image
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    image = db.query(ProductImage).filter(
        ProductImage.id == image_id,
        ProductImage.product_id == product_id
    ).first()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Delete from Cloudinary if it's a Cloudinary image
    if image.storage_type == 'cloudinary' and image.cloudinary_public_id:
        try:
            cloudinary.uploader.destroy(image.cloudinary_public_id)
        except Exception as e:
            logging.error(f"Failed to delete from Cloudinary: {str(e)}")
    
    # Delete from database
    db.delete(image)
    db.commit()
    
    # Log activity
    log_product_activity(
        db=db,
        product_id=product_id,
        user_id=current_user.id,
        merchant_id=current_user.merchant_id,
        activity_type='image_deleted',
        description=f"Deleted image",
        changes={"image_id": str(image_id)}
    )
    
    return {"message": "Image deleted successfully"}

@api_router.put("/dealer/products/{product_id}/images/reorder")
async def reorder_product_images(
    product_id: str,
    image_ids: List[str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reorder product images. Pass array of image IDs in desired order."""
    require_inventory_write_access(current_user)

    # Verify product
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_user.merchant_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update ordering
    for idx, image_id in enumerate(image_ids):
        db.query(ProductImage).filter(
            ProductImage.id == image_id,
            ProductImage.product_id == product_id
        ).update({"ordering": idx})
    
    db.commit()
    
    return {"message": "Images reordered successfully"}


# =====================================================

# Helper function to log product activities
def log_product_activity(
    db: Session,
    product_id: str,
    merchant_id: str,
    user_id: str,
    activity_type: str,
    changes: dict = None,
    description: str = None
):
    """Log product activity for audit trail"""
    activity = ProductActivityLog(
        product_id=product_id,
        merchant_id=merchant_id,
        user_id=user_id,
        activity_type=activity_type,
        changes=changes,
        description=description
    )
    db.add(activity)
    # Note: Caller should commit after their main operation


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include admin routes
from admin_routes import admin_router
api_router.include_router(admin_router)

# Include API router in main app
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


