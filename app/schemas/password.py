"""
Used when a logged in user wants to change their password
"""

from pydantic import BaseModel


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str