from pydantic import BaseModel


class ModelRecordResponse(BaseModel):
    model_id: int
    dataset_id: int
    model_name: str
    version: str
    algorithm: str
    accuracy: float | None = None
    precision: float | None = None
    recall: float | None = None
    f1_score: float | None = None
    roc_auc: float | None = None
    is_active: bool
    is_locked: bool = False
    model_path: str | None = None
    feature_columns_path: str | None = None

    class Config:
        from_attributes = True