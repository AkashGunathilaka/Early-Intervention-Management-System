from sqlalchemy import Column, Integer, Float, DateTime
from sqlalchemy.sql import func

from app.db.database import Base


class RiskThreshold(Base):
    __tablename__ = "risk_thresholds"

    id = Column(Integer, primary_key=True, index=True)
    high_threshold = Column(Float, nullable=False, default=0.7)
    medium_threshold = Column(Float, nullable=False, default=0.4)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())