"""
Token response schema 

returned after a user logs in
"""

from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str  # always "bearer" for us