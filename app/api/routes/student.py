from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from sqlalchemy import func
from app.models.prediction import Prediction
from app.models.feature_snapshot import FeatureSnapshot
from app.models.intervention import Intervention
from app.schemas.student_profile import StudentSearchResult, StudentProfileResponse
from app.api.dependencies import get_current_active_user
from app.db.database import get_db
from app.models.student import Student
from app.models.user import User
from app.schemas.student import StudentCreate, StudentResponse

router = APIRouter(prefix="/students", tags=["Students"])


@router.post("/", response_model=StudentResponse)
def create_student(
    student: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    new_student = Student(
        dataset_id=student.dataset_id,
        code_module=student.code_module,
        code_presentation=student.code_presentation,
        gender=student.gender,
        region=student.region,
        highest_education=student.highest_education,
        imd_band=student.imd_band,
        age_band=student.age_band,
        num_of_prev_attempts=student.num_of_prev_attempts,
        studied_credits=student.studied_credits,
        disability=student.disability,
    )

    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student


@router.get("/", response_model=List[StudentResponse])
def get_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return db.query(Student).all()


@router.get("/search", response_model=list[StudentSearchResult])
def search_students(
    dataset_id: int | None = None,
    risk_level: str | None = None,  # "High" | "Medium" | "Low"
    code_presentation: str | None = None,
    region: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Student)

    if dataset_id is not None:
        q = q.filter(Student.dataset_id == dataset_id)
    if code_presentation is not None:
        q = q.filter(Student.code_presentation == code_presentation)
    if region is not None:
        q = q.filter(Student.region == region)

    students = q.order_by(Student.student_id.asc()).limit(limit).all()
    if not students:
        return []

    student_ids = [s.student_id for s in students]

    # latest prediction per student (by max prediction_id)
    latest_pred_ids = (
        db.query(Prediction.student_id, func.max(Prediction.prediction_id).label("max_pid"))
        .filter(Prediction.student_id.in_(student_ids))
        .group_by(Prediction.student_id)
        .subquery()
    )

    latest_preds = (
        db.query(Prediction)
        .join(latest_pred_ids, Prediction.prediction_id == latest_pred_ids.c.max_pid)
        .all()
    )
    pred_by_student = {p.student_id: p for p in latest_preds}

    results = [
        {"student": s, "latest_prediction": pred_by_student.get(s.student_id)}
        for s in students
    ]

    if risk_level is not None:
        results = [
            r for r in results
            if r["latest_prediction"] is not None and r["latest_prediction"].risk_level == risk_level
        ]

    return results



@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    return student



@router.get("/{student_id}/profile", response_model=StudentProfileResponse)
def get_student_profile(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    latest_snapshot = (
        db.query(FeatureSnapshot)
        .filter(FeatureSnapshot.student_id == student_id)
        .order_by(FeatureSnapshot.feature_id.desc())
        .first()
    )

    latest_prediction = (
        db.query(Prediction)
        .filter(Prediction.student_id == student_id)
        .order_by(Prediction.prediction_id.desc())
        .first()
    )

    interventions = (
        db.query(Intervention)
        .filter(Intervention.student_id == student_id)
        .order_by(Intervention.intervention_id.desc())
        .all()
    )

    return {
        "student": student,
        "latest_feature_snapshot": latest_snapshot,
        "latest_prediction": latest_prediction,
        "interventions": interventions,
    }

