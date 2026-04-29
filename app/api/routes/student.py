from enum import Enum
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from sqlalchemy import func
from app.models.prediction import Prediction
from app.models.feature_snapshot import FeatureSnapshot
from app.models.intervention import Intervention
from app.schemas.student_profile import StudentSearchResult, StudentProfileResponse
from app.api.dependencies import get_current_active_user, require_admin
from app.db.database import get_db
from app.models.student import Student
from app.models.user import User
from app.schemas.student import StudentCreate, StudentResponse, StudentUpdate
from app.schemas.student_with_features import (
    StudentWithFeaturesCreate,
    StudentWithFeaturesCreateResponse,
)
from app.schemas.feature_averages import FeatureAveragesResponse
from app.services.prediction_service import predict_for_student

router = APIRouter(prefix="/students", tags=["Students"])

class RiskLevel(str, Enum):
    Low = "Low"
    Medium = "Medium"
    High = "High"


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


@router.post("/create-with-features", response_model=StudentWithFeaturesCreateResponse)
def create_student_with_features(
    payload: StudentWithFeaturesCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Create a Student and an initial FeatureSnapshot in one step.
    Optionally generates a Prediction immediately.
    """
    s = payload.student
    new_student = Student(
        dataset_id=s.dataset_id,
        code_module=s.code_module,
        code_presentation=s.code_presentation,
        gender=s.gender,
        region=s.region,
        highest_education=s.highest_education,
        imd_band=s.imd_band,
        age_band=s.age_band,
        num_of_prev_attempts=s.num_of_prev_attempts,
        studied_credits=s.studied_credits,
        disability=s.disability,
    )
    db.add(new_student)
    db.flush()  # get student_id without committing yet

    snapshot = FeatureSnapshot(
        student_id=new_student.student_id,
        days_from_start=payload.days_from_start,
        total_clicks=payload.total_clicks,
        avg_clicks=payload.avg_clicks,
        vle_records=payload.vle_records,
        avg_score=payload.avg_score,
        total_score=payload.total_score,
        assessment_count=payload.assessment_count,
        avg_weight=payload.avg_weight,
        at_risk_label=payload.at_risk_label,
    )
    db.add(snapshot)
    db.flush()

    prediction = None
    if payload.generate_prediction:
        # predict_for_student commits + refreshes prediction
        # Ensure student + snapshot are committed first
        db.commit()
        db.refresh(new_student)
        db.refresh(snapshot)
        prediction = predict_for_student(student_id=new_student.student_id, db=db)
        # predict_for_student already committed
        db.refresh(snapshot)
    else:
        db.commit()
        db.refresh(new_student)
        db.refresh(snapshot)

    return {
        "student": new_student,
        "feature_snapshot": snapshot,
        "prediction": prediction,
    }


@router.get("/{student_id}/feature-averages", response_model=FeatureAveragesResponse)
def get_feature_averages_for_student(
    student_id: int,
    days_from_start: int | None = Query(default=None, description="Override days_from_start; defaults to student's latest snapshot days_from_start"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Return dataset-level averages for engineered feature snapshot columns, so the UI can show
    'student value vs average' explanations.
    """
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    latest_snapshot = (
        db.query(FeatureSnapshot)
        .filter(FeatureSnapshot.student_id == student_id)
        .order_by(FeatureSnapshot.feature_id.desc())
        .first()
    )
    if latest_snapshot is None and days_from_start is None:
        raise HTTPException(status_code=404, detail="No feature snapshot found for this student")

    target_days = days_from_start if days_from_start is not None else latest_snapshot.days_from_start

    q = (
        db.query(
            func.count(FeatureSnapshot.feature_id).label("n"),
            func.avg(FeatureSnapshot.total_clicks).label("total_clicks"),
            func.avg(FeatureSnapshot.avg_clicks).label("avg_clicks"),
            func.avg(FeatureSnapshot.vle_records).label("vle_records"),
            func.avg(FeatureSnapshot.avg_score).label("avg_score"),
            func.avg(FeatureSnapshot.total_score).label("total_score"),
            func.avg(FeatureSnapshot.assessment_count).label("assessment_count"),
            func.avg(FeatureSnapshot.avg_weight).label("avg_weight"),
        )
        .join(Student, Student.student_id == FeatureSnapshot.student_id)
        .filter(Student.dataset_id == student.dataset_id)
        .filter(FeatureSnapshot.days_from_start == target_days)
    )
    row = q.first()
    n = int(getattr(row, "n", 0) or 0)

    avgs = {
        "total_clicks": float(getattr(row, "total_clicks", 0) or 0),
        "avg_clicks": float(getattr(row, "avg_clicks", 0) or 0),
        "vle_records": float(getattr(row, "vle_records", 0) or 0),
        "avg_score": float(getattr(row, "avg_score", 0) or 0),
        "total_score": float(getattr(row, "total_score", 0) or 0),
        "assessment_count": float(getattr(row, "assessment_count", 0) or 0),
        "avg_weight": float(getattr(row, "avg_weight", 0) or 0),
    }

    return {
        "dataset_id": student.dataset_id,
        "days_from_start": target_days,
        "n_snapshots": n,
        "averages": avgs,
    }

@router.get("/", response_model=List[StudentResponse])
def get_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return db.query(Student).all()


@router.get("/search", response_model=list[StudentSearchResult])
def search_students(
    dataset_id: int | None = Query(default=None, description="Filter by dataset_id"),
    risk_level: RiskLevel | None = Query(default=None, description="Filter by latest prediction risk level"),
    code_presentation: str | None = Query(default=None, description="Filter by code_presentation"),
    region: str | None = Query(default=None, description="Filter by region"),
    limit: int = Query(default=50, ge=1, le=500, description="Max students returned (before risk filter)"),
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



@router.put("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(student, k, v)
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    db.delete(student)
    db.commit()
    return {"message": "Student deleted"}


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

