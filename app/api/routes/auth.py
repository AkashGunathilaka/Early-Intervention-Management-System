"""
Authentication and session management routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.schemas.password import ChangePasswordRequest

from app.core.security import (
    create_access_token,
    verify_password,
    create_password_reset_token,
    decode_password_reset_token,
)
from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import Token
from app.api.dependencies import get_current_active_user
from app.schemas.user import UserResponse
from app.schemas.password_reset import PasswordResetConfirm, PasswordResetRequest
# group together
router = APIRouter(prefix="/auth", tags=["Authentication"])

# logs a user in and returns a JWT access token if the email and password are valid
@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # OAUTH2 sends the email in the username field, so we use it to find the user
    user = db.query(User).filter(User.email == form_data.username).first()

    # Same error for bad email vs bad password so we don't leak which addresses exist.
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
# block login for inactive users
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")
# store the users email in the token subject so protected routes can identify them later
    access_token = create_access_token(data={"sub": user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# Requres a valid session before returning a logout confirmation and then the frontend removes the token locally
@router.post("/logout")
def logout(current_user: User = Depends(get_current_active_user)):
    return {"message": "Logged out successfully"}

# returns the logged in users details
@router.get("/me", response_model=UserResponse)
def read_me(current_user: User = Depends(get_current_active_user)):
    return current_user


# allows a logged in user to change their password after confirming their current password
@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # check the old password first
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    # hash the new password
    current_user.password_hash = get_password_hash(payload.new_password)
    db.commit()

    return {"message": "Password updated successfully"}


# starts the password reset the reset token is returned in JSON
@router.post("/request-password-reset")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    # look up the account by email
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.is_active:
        return {"message": "If the account exists, a reset token has been generated."}
    # create a short-lived reset token
    token = create_password_reset_token(email=user.email, expires_minutes=15)
    return {
        "message": "Reset token generated.",
        "reset_token": token,
        "expires_minutes": 15,
    }


# completes the password reset by validating the token and saving a new password
@router.post("/reset-password")
def reset_password(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    # decode and reject if invalid
    try:
        email = decode_password_reset_token(payload.token)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password has been reset successfully"}