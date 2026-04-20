from pydantic import BaseModel

from app.schemas.student import StudentResponse
from app.schemas.feature_snapshot import FeatureSnapshotResponse
from app.schemas.prediction import PredictionResponse
from app.schemas.intervention import InterventionResponse


class StudentSearchResult(BaseModel):
    student: StudentResponse
    latest_prediction: PredictionResponse | None = None


class StudentProfileResponse(BaseModel):
    student: StudentResponse
    latest_feature_snapshot: FeatureSnapshotResponse | None = None
    latest_prediction: PredictionResponse | None = None
    interventions: list[InterventionResponse] = []