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

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")

    access_token = create_access_token(data={"sub": user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/logout")
def logout(current_user: User = Depends(get_current_active_user)):
    #frontend deletes the token.
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
def read_me(current_user: User = Depends(get_current_active_user)):
    return current_user
@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.password_hash = get_password_hash(payload.new_password)
    db.commit()

    return {"message": "Password updated successfully"}


@router.post("/request-password-reset")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Prototype-friendly password reset:
    - caller provides email
    - server returns a short-lived reset token (no email sending)
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.is_active:
        # avoid leaking whether an account exists
        return {"message": "If the account exists, a reset token has been generated."}

    token = create_password_reset_token(email=user.email, expires_minutes=15)
    return {
        "message": "Reset token generated (prototype mode).",
        "reset_token": token,
        "expires_minutes": 15,
    }


@router.post("/reset-password")
def reset_password(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
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