from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base


class Student(Base):
    __tablename__ = "students"

    student_id = Column(Integer, primary_key=True, index=True)

    dataset_id = Column(Integer, ForeignKey("datasets.dataset_id"), nullable=False)

    # demographic / academic info
    code_module = Column(String)
    code_presentation = Column(String)

    gender = Column(String)
    region = Column(String)
    highest_education = Column(String)
    imd_band = Column(String)
    age_band = Column(String)
    num_of_prev_attempts = Column(Integer)
    studied_credits = Column(Integer)
    disability = Column(String)

    #connecting the models with relationships
    feature_snapshots = relationship("FeatureSnapshot", back_populates="student", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="student", cascade="all, delete-orphan")
    interventions = relationship("Intervention", back_populates="student", cascade="all, delete-orphan")