from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.db.database import get_db
from app.ml.preprocessing import prepare_training_dataframe_from_raw_tables
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
        p = UPLOAD_DIR / p
    resolved = p.resolve()
    if base != resolved and base not in resolved.parents:
        raise HTTPException(status_code=400, detail="Path must be inside the uploads directory")
    return resolved


@router.post("/import-oulad")
def import_oulad_to_db(
    dataset_id: int,
    student_info_path: str,
    student_vle_path: str,
    student_assessment_path: str,
    assessments_path: str,
    early_days: int = 30,
    generate_predictions: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    student_info_file = _resolve_under_uploads(student_info_path)
    student_vle_file = _resolve_under_uploads(student_vle_path)
    student_assessment_file = _resolve_under_uploads(student_assessment_path)
    assessments_file = _resolve_under_uploads(assessments_path)

    missing = [str(p) for p in [student_info_file, student_vle_file, student_assessment_file, assessments_file] if not p.exists()]
    if missing:
        raise HTTPException(status_code=404, detail=f"Missing files: {missing}")

    student_info = pd.read_csv(student_info_file)
    student_vle = pd.read_csv(student_vle_file)
    student_assessment = pd.read_csv(student_assessment_file)
    assessments = pd.read_csv(assessments_file)

    df = prepare_training_dataframe_from_raw_tables(
        student_info=student_info,
        student_vle=student_vle,
        student_assessment=student_assessment,
        assessments=assessments,
        early_days=early_days,
        drop_code_module=False,  # keep code_module here for Student table
    )

    # Expect these columns to exist after preprocessing
    required = ["id_student", "code_module", "code_presentation", "at_risk"]
    missing_cols = [c for c in required if c not in df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"Preprocessed data missing columns: {missing_cols}")

    created_students = 0
    created_snapshots = 0
    created_predictions = 0

    from app.services.prediction_service import predict_for_student  # local import

    for _, row in df.iterrows():
        # Treat OULAD id_student as our Student.student_id (keeps consistency for demo)
        sid = int(row["id_student"])

        student = db.query(Student).filter(Student.student_id == sid).first()
        if student is None:
            student = Student(
                student_id=sid,
                dataset_id=dataset_id,
                code_module=str(row.get("code_module")) if row.get("code_module") is not None else None,
                code_presentation=str(row.get("code_presentation")) if row.get("code_presentation") is not None else None,
                gender=str(row.get("gender")) if row.get("gender") is not None else None,
                region=str(row.get("region")) if row.get("region") is not None else None,
                highest_education=str(row.get("highest_education")) if row.get("highest_education") is not None else None,
                imd_band=str(row.get("imd_band")) if row.get("imd_band") is not None else None,
                age_band=str(row.get("age_band")) if row.get("age_band") is not None else None,
                num_of_prev_attempts=int(row.get("num_of_prev_attempts")) if row.get("num_of_prev_attempts") is not None else None,
                studied_credits=int(row.get("studied_credits")) if row.get("studied_credits") is not None else None,
                disability=str(row.get("disability")) if row.get("disability") is not None else None,
            )
            db.add(student)
            created_students += 1

        snapshot = FeatureSnapshot(
            student_id=sid,
            days_from_start=early_days,
            total_clicks=float(row.get("total_clicks") or 0),
            avg_clicks=float(row.get("avg_clicks") or 0),
            vle_records=int(row.get("vle_records") or 0),
            avg_score=float(row.get("avg_score") or 0),
            total_score=float(row.get("total_score") or 0),
            assessment_count=int(row.get("assessment_count") or 0),
            avg_weight=float(row.get("avg_weight") or 0),
            at_risk_label=int(row.get("at_risk")) if row.get("at_risk") is not None else None,
        )
        db.add(snapshot)
        created_snapshots += 1

        db.flush()  # ensure snapshot exists before prediction lookup

        if generate_predictions:
            pred = predict_for_student(student_id=sid, db=db)
            if pred:
                created_predictions += 1

    db.commit()

    return {
        "dataset_id": dataset_id,
        "early_days": early_days,
        "created_students": created_students,
        "created_feature_snapshots": created_snapshots,
        "created_predictions": created_predictions,
    }