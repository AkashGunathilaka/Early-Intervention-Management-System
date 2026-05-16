"""
Feature snapshot model

each row stores the calculated learning activity for one studet at a specific point in time. the latest snapshot is used for prediction
"""

from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base


class FeatureSnapshot(Base):
    __tablename__ = "feature_snapshots"
    feature_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id"), nullable=False)
    
    # date used as the cut off
    days_from_start = Column(Integer, nullable=False)

    # engagement and assessment features for the model
    total_clicks = Column(Float, default=0)
    avg_clicks = Column(Float, default=0)
    vle_records = Column(Integer, default=0)
    avg_score = Column(Float, default=0)
    total_score = Column(Float, default=0)
    assessment_count = Column(Integer, default=0)
    avg_weight = Column(Float, default=0)

    # Optional label from training data
    # manually created snapshots do not have this label
    at_risk_label = Column(Integer, nullable=True)

    student = relationship("Student", back_populates="feature_snapshots")
    predictions = relationship("Prediction", back_populates="feature_snapshot", cascade="all, delete-orphan")