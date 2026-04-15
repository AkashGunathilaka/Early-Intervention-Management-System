from pydantic import BaseModel, Field


class RiskThresholdUpdate(BaseModel):
    high_threshold: float = Field(..., gt=0, lt=1)
    medium_threshold: float = Field(..., gt=0, lt=1)


class RiskThresholdResponse(BaseModel):
    id: int
    high_threshold: float
    medium_threshold: float

    class Config:
        from_attributes = True