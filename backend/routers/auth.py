"""Dealer/subdealer authentication and registration."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import create_access_token, get_current_user, get_password_hash, verify_password
from database import get_db
from models import Merchant, User
from schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterDealerRequest,
    SignUpRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    user.last_login = datetime.now(timezone.utc)
    db.commit()

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
            "preferred_language": user.preferred_language or "en",
        },
    }


@router.post("/signup")
async def signup(request: SignUpRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    if db.query(User).filter(User.phone == request.phone).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered",
        )

    try:
        merchant = Merchant(
            name=request.business_name,
            email=request.email,
            phone=request.phone,
            city=request.city,
            state=request.state,
            country="India",
            postal_code=request.postal_code,
            address=request.address,
        )
        db.add(merchant)
        db.flush()

        user = User(
            username=request.owner_name,
            email=request.email,
            phone=request.phone,
            password_hash=get_password_hash(request.password),
            user_type="dealer",
            merchant_id=merchant.id,
            is_active=True,
        )
        db.add(user)
        db.commit()

        return {
            "message": "Account created successfully",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "merchant_id": str(merchant.id),
            },
        }
    except Exception as e:
        db.rollback()
        logging.error("Signup error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create account",
        )


@router.post("/register/dealer")
async def register_dealer(request: RegisterDealerRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    merchant = Merchant(
        name=request.merchant_name,
        email=request.merchant_email,
        phone=request.merchant_phone,
        address=request.address,
        city=request.city,
        state=request.state,
        gst_number=request.gst_number,
    )
    db.add(merchant)
    db.flush()

    user = User(
        username=request.username,
        email=request.email,
        phone=request.phone,
        password_hash=get_password_hash(request.password),
        user_type="dealer",
        merchant_id=merchant.id,
        role="admin",
        is_verified=True,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "user_type": user.user_type,
            "merchant_id": str(user.merchant_id),
        },
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "user_type": current_user.user_type,
        "merchant_id": str(current_user.merchant_id) if current_user.merchant_id else None,
        "preferred_language": current_user.preferred_language,
    }
