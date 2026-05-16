"""
Prediction comparison schema 

used to compare a students latest and previous predictions
"""

from pydantic import BaseModel

from app.schemas.prediction import PredictionResponse


class PredictionCompareResponse(BaseModel):
    latest: PredictionResponse | None = None
    previous: PredictionResponse | None = None
    # Positive = risk went up, negative = risk went down. None when we can't
    # compute it (no comparison possible).
    delta_risk_score: float | None = None

