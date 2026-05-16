"""
Password reset schemas

used for requesting a password reset and then confirming the reset
"""

from pydantic import BaseModel, EmailStr


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

