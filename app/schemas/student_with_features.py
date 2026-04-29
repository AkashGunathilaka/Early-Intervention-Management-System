from pydantic import BaseModel

from app.schemas.student import StudentCreate, StudentResponse
from app.schemas.feature_snapshot import FeatureSnapshotResponse
from app.schemas.prediction import PredictionResponse


class StudentWithFeaturesCreate(BaseModel):
    student: StudentCreate

    # Feature snapshot fields (engineered features)
    days_from_start: int = 30
    total_clicks: float = 0
    avg_clicks: float = 0
    vle_records: int = 0
    avg_score: float = 0
    total_score: float = 0
    assessment_count: int = 0
    avg_weight: float = 0
    at_risk_label: int | None = None

    # Demo convenience: generate prediction immediately after creating snapshot
    generate_prediction: bool = True


class StudentWithFeaturesCreateResponse(BaseModel):
    student: StudentResponse
    feature_snapshot: FeatureSnapshotResponse
    prediction: PredictionResponse | None = None

