from sqlalchemy import Column, Integer, Float, ForeignKey
from app.db.database import Base


class FeatureSnapshot(Base):
    __tablename__ = "feature_snapshots"
    feature_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id"), nullable=False)
    days_from_start = Column(Integer, nullable=False)
    # engineered ML features
    total_clicks = Column(Float, default=0)
    avg_clicks = Column(Float, default=0)
    vle_records = Column(Integer, default=0)
    avg_score = Column(Float, default=0)
    total_score = Column(Float, default=0)
    assessment_count = Column(Integer, default=0)
    avg_weight = Column(Float, default=0)
    at_risk_label = Column(Integer, nullable=True)