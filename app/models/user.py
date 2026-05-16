"""
User account model.

Each row stores one account used to log in to the system. The role controls what the user is allowed to access in the backend. 
"""

from pydantic import EmailStr
from sqlalchemy import Column, String, Integer, Boolean
from sqlalchemy.orm import relationship

from app.db.database import Base

class User(Base):
    __tablename__ = 'users'

    user_id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    #email is used to log in so should be unique
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    interventions = relationship("Intervention", back_populates="creator")