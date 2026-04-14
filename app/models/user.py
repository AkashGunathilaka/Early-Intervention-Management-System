from pydantic import EmailStr
from sqlalchemy import Column, String, Integer, Boolean
from sqlalchemy.orm import relationship

from app.db.database import Base

class User(Base):
    __tablename__ = 'users'

    user_id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    interventions = relationship("Intervention", back_populates="creator")