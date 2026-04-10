from pydantic import BaseModel

from pydantic import BaseModel


class FeatureSnapshotCreate(BaseModel):
    student_id: int
    days_from_start: int
    total_clicks: float = 0
    avg_clicks: float = 0
    vle_records: int = 0
    avg_score: float = 0
    total_score: float = 0
    assessment_count: int = 0
    avg_weight: float = 0
    at_risk_label: int | None = None


class FeatureSnapshotResponse(BaseModel):
    feature_id: int
    student_id: int
    days_from_start: int
    total_clicks: float
    avg_clicks: float
    vle_records: int
    avg_score: float
    total_score: float
    assessment_count: int
    avg_weight: float
    at_risk_label: int | None = None

    class Config:
        from_attributes = True