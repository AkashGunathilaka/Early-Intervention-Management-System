from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.db.database import Base
from sqlalchemy.orm import relationship


class Prediction(Base):
    __tablename__ = "predictions"

    prediction_id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer, ForeignKey("students.student_id"), nullable=False)
    feature_id = Column(Integer, ForeignKey("feature_snapshots.feature_id"), nullable=False)
    model_id = Column(Integer, ForeignKey("model_records.model_id"), nullable=False)

    risk_score = Column(Float, nullable=False)
    predicted_label = Column(Integer, nullable=False)
    risk_level = Column(String, nullable=False)
    confidence_score = Column(Float, nullable=True)

    # store explanation text or JSON as text for now
    top_factors = Column(Text, nullable=True)

    prediction_date = Column(DateTime(timezone=True), server_default=func.now())
    student = relationship("Student", back_populates="prediction")

    #connecting the models with relationships
    student = relationship("Student", back_populates="predictions")
    feature_snapshot = relationship("FeatureSnapshot", back_populates="predictions")
    model_record = relationship("ModelRecord", back_populates="predictions")
    interventions = relationship(
        "Intervention",
        back_populates="prediction",
        cascade="all, delete-orphan"
    )