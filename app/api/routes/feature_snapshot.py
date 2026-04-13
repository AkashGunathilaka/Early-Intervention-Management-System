from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_active_user
from app.db.database import get_db
from app.models.feature_snapshot import FeatureSnapshot
from app.models.student import Student
from app.models.user import User
from app.schemas.feature_snapshot import (
    FeatureSnapshotCreate,
    FeatureSnapshotResponse,
)

router = APIRouter(prefix="/feature-snapshots", tags=["Feature Snapshots"])


@router.post("/", response_model=FeatureSnapshotResponse)
def create_feature_snapshot(
    feature_snapshot: FeatureSnapshotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = (
        db.query(Student)
        .filter(Student.student_id == feature_snapshot.student_id)
        .first()
    )

    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    new_feature_snapshot = FeatureSnapshot(
        student_id=feature_snapshot.student_id,
        days_from_start=feature_snapshot.days_from_start,
        total_clicks=feature_snapshot.total_clicks,
        avg_clicks=feature_snapshot.avg_clicks,
        vle_records=feature_snapshot.vle_records,
        avg_score=feature_snapshot.avg_score,
        total_score=feature_snapshot.total_score,
        assessment_count=feature_snapshot.assessment_count,
        avg_weight=feature_snapshot.avg_weight,
        at_risk_label=feature_snapshot.at_risk_label,
    )

    db.add(new_feature_snapshot)
    db.commit()
    db.refresh(new_feature_snapshot)

    return new_feature_snapshot


@router.get("/", response_model=list[FeatureSnapshotResponse])
def get_feature_snapshots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return db.query(FeatureSnapshot).all()


@router.get("/{feature_id}", response_model=FeatureSnapshotResponse)
def get_feature_snapshot(
    feature_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    feature_snapshot = (
        db.query(FeatureSnapshot)
        .filter(FeatureSnapshot.feature_id == feature_id)
        .first()
    )

    if feature_snapshot is None:
        raise HTTPException(status_code=404, detail="Feature snapshot not found")

    return feature_snapshot


@router.get("/student/{student_id}", response_model=list[FeatureSnapshotResponse])
def get_feature_snapshots_for_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()

    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    return (
        db.query(FeatureSnapshot)
        .filter(FeatureSnapshot.student_id == student_id)
        .all()
    )