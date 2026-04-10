from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.db.database import Base
from sqlalchemy.sql import func


class Dataset(Base):
    __tablename__ = "datasets"

    dataset_id = Column(Integer, primary_key=True, index=True)
    dataset_name = Column(String, nullable=False)
    source_type = Column(String, nullable=False)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)