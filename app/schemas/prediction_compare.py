from pydantic import BaseModel

from app.schemas.prediction import PredictionResponse


class PredictionCompareResponse(BaseModel):
    latest: PredictionResponse | None = None
    previous: PredictionResponse | None = None
    delta_risk_score: float | None = None

