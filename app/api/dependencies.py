"""
Authentication dependancies

these functions are used in the route dependancies to check who the user is and what they are allowed to access
"""

import jwt
from jwt.exceptions import InvalidTokenError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import SECRET_KEY, ALGORITHM
from app.db.database import get_db
from app.models.user import User

# Tells FastAPI where users can log in to get their access token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Reuse the same 401 response whenever the token is missing or invalid
credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    # Read the JWT token and return the matching user from the database
    try:
        # decode checks that the token was signed correctly and not expired
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception

    # We load the user from the database instead of trusting user details in the token
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception

    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
):
    # Return the current user only if their account is active
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")
    return current_user

def require_admin(
    current_user: User = Depends(get_current_active_user),
):
    # Return the current user if they are admin
    if current_user.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
