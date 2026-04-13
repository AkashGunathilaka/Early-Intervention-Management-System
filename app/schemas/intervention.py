from pydantic import BaseModel
from datetime import datetime


class InterventionCreate(BaseModel):
    student_id: int
    prediction_id: int
    suggested_action: str
    action_status: str = "pending"
    priority_level: str
    notes: str | None = None
    follow_up_date: datetime | None = None


class InterventionResponse(BaseModel):
    intervention_id: int
    student_id: int
    prediction_id: int
    created_by: int
    suggested_action: str
    action_status: str
    priority_level: str
    notes: str | None = None
    follow_up_date: datetime | None = None

    class Config:
        from_attributes = True