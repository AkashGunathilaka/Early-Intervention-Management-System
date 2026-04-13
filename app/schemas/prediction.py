from pydantic import BaseModel
from datetime import datetime


class PredictionResponse(BaseModel):
    prediction_id: int
    student_id: int
    feature_id: int
    model_id: int
    risk_score: float
    predicted_label: int
    risk_level: str
    confidence_score: float | None = None
    top_factors: str | None = None
    prediction_date: datetime

    class Config:
        from_attributes = True




