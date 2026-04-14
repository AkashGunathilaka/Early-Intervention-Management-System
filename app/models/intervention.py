from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Intervention(Base):
    __tablename__ = "interventions"

    intervention_id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer, ForeignKey("students.student_id"), nullable=False)
    prediction_id = Column(Integer, ForeignKey("predictions.prediction_id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)

    suggested_action = Column(String, nullable=False)
    action_status = Column(String, nullable=False, default="pending")
    priority_level = Column(String, nullable=False)

    notes = Column(Text, nullable=True)
    follow_up_date = Column(DateTime, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    student = relationship("Student", back_populates="interventions")
    prediction = relationship("Prediction", back_populates="interventions")
    creator = relationship("User", back_populates="interventions")