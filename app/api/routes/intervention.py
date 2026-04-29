from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.feature_snapshot import FeatureSnapshot
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

@router.get("/suggestions/{student_id}")
def get_intervention_suggestions(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    latest_prediction = (
        db.query(Prediction)
        .filter(Prediction.student_id == student_id)
        .order_by(Prediction.prediction_id.desc())
        .first()
    )
    if latest_prediction is None:
        raise HTTPException(status_code=404, detail="No prediction found for this student")

    latest_snapshot = (
        db.query(FeatureSnapshot)
        .filter(FeatureSnapshot.student_id == student_id)
        .order_by(FeatureSnapshot.feature_id.desc())
        .first()
    )

    suggestions: list[str] = []
    priority = "low"

    # Simple rule-based suggestions (kept intentionally deterministic and transparent)
    if latest_prediction.risk_level == "High":
        priority = "high"
        suggestions.extend([
            "Schedule an urgent 1:1 meeting within 7 days.",
            "Review recent assessment performance and missed submissions.",
            "Create a short weekly engagement plan and monitor VLE activity.",
            "Offer support resources (study skills, wellbeing, tutoring).",
        ])
    elif latest_prediction.risk_level == "Medium":
        priority = "medium"
        suggestions.extend([
            "Send a check-in message and recommend office hours.",
            "Monitor engagement weekly and re-run prediction after new activity.",
            "Suggest targeted study resources for weak areas.",
        ])
    else:
        priority = "low"
        suggestions.extend([
            "No immediate intervention required; continue routine monitoring.",
            "Encourage consistent engagement with learning materials.",
        ])

    # Feature-driven nudge (if snapshot exists)
    if latest_snapshot is not None:
        if (latest_snapshot.avg_score or 0) < 40:
            suggestions.append("Low average score detected: recommend revision plan and assessment support.")
        if (latest_snapshot.total_clicks or 0) < 50:
            suggestions.append("Low engagement detected: encourage regular VLE activity and set weekly goals.")
        if (latest_snapshot.assessment_count or 0) == 0:
            suggestions.append("No assessments submitted in early period: check for access/issues and provide guidance.")

    return {
        "student_id": student_id,
        "prediction_id": latest_prediction.prediction_id,
        "risk_level": latest_prediction.risk_level,
        "risk_score": latest_prediction.risk_score,
        "priority": priority,
        "top_factors": latest_prediction.top_factors,
        "suggestions": suggestions,
    }

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