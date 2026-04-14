from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.intervention import Intervention
from app.models.student import Student
from app.models.prediction import Prediction
from app.schemas.intervention import (
    InterventionCreate,
    InterventionUpdate,
    InterventionResponse,
)
from app.api.dependencies import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/interventions", tags=["Interventions"])


@router.post("/", response_model=InterventionResponse)
def create_intervention(
    intervention: InterventionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = db.query(Student).filter(
        Student.student_id == intervention.student_id
    ).first()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    prediction = db.query(Prediction).filter(
        Prediction.prediction_id == intervention.prediction_id
    ).first()
    if prediction is None:
        raise HTTPException(status_code=404, detail="Prediction not found")

    if prediction.student_id != intervention.student_id:
        raise HTTPException(
            status_code=400,
            detail="Prediction does not belong to the given student"
        )

    new_intervention = Intervention(
        student_id=intervention.student_id,
        prediction_id=intervention.prediction_id,
        created_by=current_user.user_id,
        suggested_action=intervention.suggested_action,
        action_status=intervention.action_status,
        priority_level=intervention.priority_level,
        notes=intervention.notes,
        follow_up_date=intervention.follow_up_date,
    )

    db.add(new_intervention)
    db.commit()
    db.refresh(new_intervention)

    return new_intervention


@router.get("/", response_model=list[InterventionResponse])
def get_interventions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return db.query(Intervention).all()


@router.get("/student/{student_id}", response_model=list[InterventionResponse])
def get_interventions_for_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    return db.query(Intervention).filter(
        Intervention.student_id == student_id
    ).all()


@router.get("/{intervention_id}", response_model=InterventionResponse)
def get_intervention(
    intervention_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    intervention = db.query(Intervention).filter(
        Intervention.intervention_id == intervention_id
    ).first()

    if intervention is None:
        raise HTTPException(status_code=404, detail="Intervention not found")

    return intervention


@router.put("/{intervention_id}", response_model=InterventionResponse)
def update_intervention(
    intervention_id: int,
    intervention_update: InterventionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    intervention = db.query(Intervention).filter(
        Intervention.intervention_id == intervention_id
    ).first()

    if intervention is None:
        raise HTTPException(status_code=404, detail="Intervention not found")

    if intervention_update.suggested_action is not None:
        intervention.suggested_action = intervention_update.suggested_action

    if intervention_update.action_status is not None:
        intervention.action_status = intervention_update.action_status

    if intervention_update.priority_level is not None:
        intervention.priority_level = intervention_update.priority_level

    if intervention_update.notes is not None:
        intervention.notes = intervention_update.notes

    if intervention_update.follow_up_date is not None:
        intervention.follow_up_date = intervention_update.follow_up_date

    db.commit()
    db.refresh(intervention)

    return intervention