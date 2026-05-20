"""
Dashboard api routes

provides the summary data used by the dashboard
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_active_user
from app.db.database import get_db
from app.db.queries import latest_risk_level_counts
from app.models.intervention import Intervention
from app.models.prediction import Prediction
from app.models.student import Student
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_dashboard_summary(
    dataset_id: int | None = Query(default=None, description="Filter dashboard to a single dataset/cohort"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    s_q = db.query(func.count(Student.student_id))
    p_q = db.query(func.count(Prediction.prediction_id)).join(Student, Student.student_id == Prediction.student_id)
    i_q = db.query(func.count(Intervention.intervention_id)).join(Student, Student.student_id == Intervention.student_id)

    if dataset_id is not None:
        s_q = s_q.filter(Student.dataset_id == dataset_id)
        p_q = p_q.filter(Student.dataset_id == dataset_id)
        i_q = i_q.filter(Student.dataset_id == dataset_id)

    total_students = s_q.scalar() or 0
    total_predictions = p_q.scalar() or 0
    total_interventions = i_q.scalar() or 0
    counts = latest_risk_level_counts(db, dataset_id=dataset_id)

    return {
        "total_students": total_students,
        "total_predictions": total_predictions,
        "total_interventions": total_interventions,
        "risk_counts": {
            "high": counts["High"],
            "medium": counts["Medium"],
            "low": counts["Low"],
        },
    }


@router.get("/risk-distribution")
def get_risk_distribution(
    dataset_id: int | None = Query(default=None, description="Filter dashboard to a single dataset/cohort"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return latest_risk_level_counts(db, dataset_id=dataset_id)


@router.get("/recent-high-risk")
def get_recent_high_risk(
    limit: int = 10,
    dataset_id: int | None = Query(default=None, description="Filter dashboard to a single dataset/cohort"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Prediction).join(Student, Student.student_id == Prediction.student_id).filter(Prediction.risk_level == "High")
    if dataset_id is not None:
        q = q.filter(Student.dataset_id == dataset_id)
    rows = q.order_by(Prediction.prediction_date.desc()).limit(limit).all()

    return [
        {
            "prediction_id": r.prediction_id,
            "student_id": r.student_id,
            "risk_score": r.risk_score,
            "confidence_score": r.confidence_score,
            "prediction_date": r.prediction_date,
            "top_factors": r.top_factors,
        }
        for r in rows
    ]


@router.get("/intervention-status")
def get_intervention_status(
    dataset_id: int | None = Query(default=None, description="Filter dashboard to a single dataset/cohort"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Intervention.action_status, func.count(Intervention.intervention_id)).join(
        Student, Student.student_id == Intervention.student_id
    )
    if dataset_id is not None:
        q = q.filter(Student.dataset_id == dataset_id)
    rows = q.group_by(Intervention.action_status).all()

    return {status: count for status, count in rows}
