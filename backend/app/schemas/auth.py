"""Pydantic schemas for authentication and user management."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return str(value).strip().lower()


class SignupRequest(BaseModel):
    email: EmailStr
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return str(value).strip().lower()

    @field_validator("first_name", "last_name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Name must not be blank.")
        return normalized


class ActivateAccountRequest(BaseModel):
    token: str = Field(min_length=20, max_length=256)
    password: str = Field(min_length=8, max_length=128)


class PasswordResetRequest(BaseModel):
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return str(value).strip().lower()


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=20, max_length=256)
    new_password: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str | None = None
    avatar_url: str | None = None
    department: str | None = None
    phone: str | None = None
    created_at: datetime | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str | None = None
    department: str | None = None
    phone: str | None = None
    is_active: bool = True
    created_at: datetime | None = None


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(None, max_length=255)
    department: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=50)
    avatar_url: str | None = None


class UpdateUserRoleRequest(BaseModel):
    role: str = Field(min_length=1, max_length=100)


class RolePermissionsResponse(BaseModel):
    role: str
    permissions: dict


class UpdateRolePermissionsRequest(BaseModel):
    role: str = Field(min_length=1, max_length=100)
    permissions: dict


class MessageResponse(BaseModel):
    message: str


class AuthErrorResponse(BaseModel):
    detail: str
