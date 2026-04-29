from datetime import datetime

from pydantic import BaseModel


class DatasetCreate(BaseModel):
    dataset_name: str
    source_type: str = "manual"


class DatasetResponse(BaseModel):
    dataset_id: int
    dataset_name: str
    source_type: str
    file_path: str | None = None
    upload_date: datetime | None = None
    status: str
    uploaded_by: int

    class Config:
        from_attributes = True

