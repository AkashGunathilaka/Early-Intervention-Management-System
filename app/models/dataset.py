"""
Dataset model

Each row represents a dataset that was uploaded or created manually
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.db.database import Base
from sqlalchemy.sql import func


class Dataset(Base):
    __tablename__ = "datasets"

    dataset_id = Column(Integer, primary_key=True, index=True)
    dataset_name = Column(String, nullable=False)
    # Where the data came from: 'upload', 'manual', etc. Just for display.
    source_type = Column(String, nullable=False)
    # Optional — manual datasets have no file. Path is relative to ./uploads.
    file_path = Column(String, nullable=True)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    # 'uploaded' | 'created' etc. Used by the admin UI for filtering.
    status = Column(String, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)