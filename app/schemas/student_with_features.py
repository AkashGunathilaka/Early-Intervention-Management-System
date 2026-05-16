"""
Student wth feature schemas

used when creating a student together with their first feature snapshot this lets the new student be ready for prediction right away
"""

from pydantic import BaseModel

from app.schemas.student import StudentCreate, StudentResponse
from app.schemas.feature_snapshot import FeatureSnapshotResponse
from app.schemas.prediction import PredictionResponse


class StudentWithFeaturesCreate(BaseModel):
    student: StudentCreate

    # initial feature snapshot values
    days_from_start: int = 30
    total_clicks: float = 0
    avg_clicks: float = 0
    vle_records: int = 0
    avg_score: float = 0
    total_score: float = 0
    assessment_count: int = 0
    avg_weight: float = 0
    at_risk_label: int | None = None

  #whether to generate a prediction for the new student
    generate_prediction: bool = True


class StudentWithFeaturesCreateResponse(BaseModel):
    student: StudentResponse
    feature_snapshot: FeatureSnapshotResponse
    prediction: PredictionResponse | None = None
    prediction_error: str | None = None

