from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base
from sqlalchemy.orm import relationship


class ModelRecord(Base):
    __tablename__ = "model_records"

    model_id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.dataset_id"), nullable=False)
    model_name = Column(String, nullable=False)
    version = Column(String, nullable=False)
    algorithm = Column(String, nullable=False)
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    roc_auc = Column(Float, nullable=True)
    is_active = Column(Boolean, default=False)


    #connecting the models with relationships
    predictions = relationship("Prediction", back_populates="model_record", cascade="all, delete-orphan")