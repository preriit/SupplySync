"""Pydantic models for auth endpoints."""

from typing import Optional

from pydantic import BaseModel, EmailStr


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
    username: Optional[str] = None
    phone: Optional[str] = None
    preferred_language: Optional[str] = None
