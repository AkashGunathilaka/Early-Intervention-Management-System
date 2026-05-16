"""
User schemas

these define the request and response formats used by the user endpoints
"""

from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    # default role is staff
    role: str = "staff"


class UserResponse(BaseModel):
    # password is not included in the response
    user_id: int
    full_name: str
    email: EmailStr
    role: str
    is_active: bool

    class Config:
        from_attributes = True