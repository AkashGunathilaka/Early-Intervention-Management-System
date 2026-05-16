"""
Security helpers

This file keeps password hashing and JWT token logic in one place so the rest of the app does not need to handle those directly
"""

from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from dotenv import load_dotenv
import os

load_dotenv()

# Secret used to sign JWT tokens
# if this changes all existing tokens will stop working
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
  raise ValueError("SECRET_KEY is not set in environment variables")
# Do not allow the app to start with an unsage or placeholder
if SECRET_KEY.strip().upper().startswith("CHANGE_ME") or len(SECRET_KEY) < 32:
  raise ValueError("SECRET_KEY must be at least 32 characters long")

# algorithm used when signing and checking JWT tokens
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# How long a token should stay valid for
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# password hashing helper , the recommended preset gives a secure default hashing setup
password_hash = PasswordHash.recommended()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    #checking whether a plain password matches the hash
    return password_hash.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    #hash before saving to database
    return password_hash.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    # Create a signed JWT access token
    # contains the users email as the sub and expiry time is added
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_password_reset_token(email: str, expires_minutes: int = 15) -> str:
    # create a short lived token for password reset
    # the purpose field makes sure the token is only used for password resets and not logins
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {"sub": email, "purpose": "password_reset", "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_password_reset_token(token: str) -> str:
    #decode the password reset token and return the email inside it
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    if payload.get("purpose") != "password_reset":
        raise ValueError("Invalid token purpose")
    email = payload.get("sub")
    if not email:
        raise ValueError("Missing subject")
    return str(email)
