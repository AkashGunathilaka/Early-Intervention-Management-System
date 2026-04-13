from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.intervention import Intervention
from app.models.student import Student
from app.models.prediction import Prediction
from app.schemas.intervention import InterventionCreate, InterventionResponse
from app.api.dependencies import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/interventions", tags=["Interventions"])


@router.post("/", response_model=InterventionResponse)
def create_intervention(
    intervention: InterventionCreate,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user),
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

    user = db.query(User).filter(
        User.user_id == intervention.created_by
    ).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

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
def get_interventions(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return db.query(Intervention).all()


@router.get("/{intervention_id}", response_model=InterventionResponse)
def get_intervention(intervention_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    intervention = db.query(Intervention).filter(
        Intervention.intervention_id == intervention_id
    ).first()

    if intervention is None:
        raise HTTPException(status_code=404, detail="Intervention not found")

    return intervention


@router.get("/student/{student_id}", response_model=list[InterventionResponse])
def get_interventions_for_student(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return db.query(Intervention).filter(
        Intervention.student_id == student_id
    ).all()