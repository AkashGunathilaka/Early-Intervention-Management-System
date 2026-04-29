from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.db.database import get_db
from app.models.feature_snapshot import FeatureSnapshot
from app.models.student import Student
from app.models.user import User

router = APIRouter(prefix="/admin/data", tags=["Admin - Data"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _resolve_under_uploads(raw_path: str) -> Path:
    base = UPLOAD_DIR.resolve()
    p = Path(raw_path).expanduser()
    if not p.is_absolute():
        # Accept both "file.csv" and "uploads/file.csv" without double-prefixing
        if p.parts and p.parts[0] == UPLOAD_DIR.name:
            p = Path(*p.parts[1:])
        p = UPLOAD_DIR / p
    resolved = p.resolve()
    if base != resolved and base not in resolved.parents:
        raise HTTPException(status_code=400, detail="Path must be inside the uploads directory")
    return resolved


@router.post("/import-oulad")
def import_students_from_csv(
    dataset_id: int,
    csv_path: str,
    generate_predictions: bool = True,
    upsert_students: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Bulk import Students + FeatureSnapshots from a single CSV that matches your app column names.

    Expected CSV columns:

    Student columns (required):
    - code_module, code_presentation, gender, region, highest_education, imd_band, age_band,
      num_of_prev_attempts, studied_credits, disability

    Feature snapshot columns (required):
    - days_from_start, total_clicks, avg_clicks, vle_records, avg_score, total_score,
      assessment_count, avg_weight

    Optional:
    - student_id (if provided and upsert_students=True, we update/insert by that id)
    - at_risk_label
    """

    csv_file = _resolve_under_uploads(csv_path)
    if not csv_file.exists():
        raise HTTPException(status_code=404, detail=f"Missing file: {csv_file}")

    df = pd.read_csv(csv_file)

    required_student_cols = [
        "code_module",
        "code_presentation",
        "gender",
        "region",
        "highest_education",
        "imd_band",
        "age_band",
        "num_of_prev_attempts",
        "studied_credits",
        "disability",
    ]
    required_snapshot_cols = [
        "days_from_start",
        "total_clicks",
        "avg_clicks",
        "vle_records",
        "avg_score",
        "total_score",
        "assessment_count",
        "avg_weight",
    ]
    missing_cols = [c for c in (required_student_cols + required_snapshot_cols) if c not in df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"CSV missing columns: {missing_cols}")

    created_students = 0
    created_snapshots = 0
    created_predictions = 0

    from app.services.prediction_service import predict_for_student  # local import

    for _, row in df.iterrows():
        sid = None
        if "student_id" in df.columns and pd.notna(row.get("student_id")):
            try:
                sid = int(row.get("student_id"))
            except Exception:
                raise HTTPException(status_code=400, detail=f"Invalid student_id value: {row.get('student_id')}")

        student = None
        if sid is not None:
            student = db.query(Student).filter(Student.student_id == sid).first()

        if student is None:
            student = Student(
                dataset_id=dataset_id,
                code_module=str(row.get("code_module")),
                code_presentation=str(row.get("code_presentation")),
                gender=str(row.get("gender")),
                region=str(row.get("region")),
                highest_education=str(row.get("highest_education")),
                imd_band=str(row.get("imd_band")),
                age_band=str(row.get("age_band")),
                num_of_prev_attempts=int(row.get("num_of_prev_attempts")),
                studied_credits=int(row.get("studied_credits")),
                disability=str(row.get("disability")),
            )
            if sid is not None:
                student.student_id = sid
            db.add(student)
            db.flush()
            created_students += 1
        elif upsert_students:
            # Update demographic fields if a student_id row already exists
            student.dataset_id = dataset_id
            student.code_module = str(row.get("code_module"))
            student.code_presentation = str(row.get("code_presentation"))
            student.gender = str(row.get("gender"))
            student.region = str(row.get("region"))
            student.highest_education = str(row.get("highest_education"))
            student.imd_band = str(row.get("imd_band"))
            student.age_band = str(row.get("age_band"))
            student.num_of_prev_attempts = int(row.get("num_of_prev_attempts"))
            student.studied_credits = int(row.get("studied_credits"))
            student.disability = str(row.get("disability"))

        snapshot = FeatureSnapshot(
            student_id=student.student_id,
            days_from_start=int(row.get("days_from_start")),
            total_clicks=float(row.get("total_clicks") or 0),
            avg_clicks=float(row.get("avg_clicks") or 0),
            vle_records=int(row.get("vle_records") or 0),
            avg_score=float(row.get("avg_score") or 0),
            total_score=float(row.get("total_score") or 0),
            assessment_count=int(row.get("assessment_count") or 0),
            avg_weight=float(row.get("avg_weight") or 0),
            at_risk_label=int(row.get("at_risk_label")) if pd.notna(row.get("at_risk_label")) else None,
        )
        db.add(snapshot)
        created_snapshots += 1

        db.flush()  # ensure snapshot exists before prediction lookup

        if generate_predictions:
            # Skip explanations during bulk import to keep ingestion fast; per-student regeneration
            # can populate explainability fields later.
            pred = predict_for_student(student_id=student.student_id, db=db, explain=False)
            if pred:
                created_predictions += 1

    db.commit()

    return {
        "dataset_id": dataset_id,
        "early_days": None,
        "created_students": created_students,
        "created_feature_snapshots": created_snapshots,
        "created_predictions": created_predictions,
    }