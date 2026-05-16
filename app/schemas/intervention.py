"""
Intervention schemas.

these define the request and response formates for intervention records 
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class ActionStatus(str, Enum):
    #allowed status values for an intervention
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class InterventionCreate(BaseModel):
    #required fields for a new intervention
    student_id: int
    prediction_id: int
    suggested_action: str
    action_status: ActionStatus = ActionStatus.pending
    priority_level: str
    notes: str | None = None
    follow_up_date: datetime | None = None


class InterventionUpdate(BaseModel):
    #optional fields for updating an intervention
    suggested_action: str | None = None
    action_status: ActionStatus | None = None
    priority_level: str | None = None
    notes: str | None = None
    follow_up_date: datetime | None = None


class InterventionResponse(BaseModel):
    #read-only view sent back to the frontend
    intervention_id: int
    student_id: int
    prediction_id: int
    created_by: int
    suggested_action: str
    action_status: ActionStatus
    priority_level: str
    notes: str | None = None
    follow_up_date: datetime | None = None

    class Config:
        from_attributes = True