
"""
Admin data import routes

this file handles importing OULAD style CSV data into the system.
"""
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.api.upload_paths import resolve_under_uploads
from app.db.database import get_db
from app.db.sequences import reset_sequence
from app.models.feature_snapshot import FeatureSnapshot
from app.models.student import Student
from app.models.user import User

router = APIRouter(prefix="/admin/data", tags=["Admin - Data"])


# Converts the given CSV path into a safe path inside the uploads folder preventing users from importing files outside the allowed directory
@router.post("/import-oulad")
def import_students_from_csv(
    dataset_id: int,
    csv_path: str,
    generate_predictions: bool = True,
    upsert_students: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    #import route for loading prepared OULAD style data into the database. It creates/updates students, adds featuresnashots and can generate the predictions
    csv_file = resolve_under_uploads(csv_path)
    if not csv_file.exists():
        raise HTTPException(status_code=404, detail=f"Missing file: {csv_file}")
#Read the CSV into a dataframe so each row can be imported
    df = pd.read_csv(csv_file)
# these are the columns needed to create or update student records
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
#these are the columns needed to create the feature snapshot used by the model
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
    #check the structure before importing
    missing_cols = [c for c in (required_student_cols + required_snapshot_cols) if c not in df.columns]
    if missing_cols:
        raise HTTPException(status_code=400, detail=f"CSV missing columns: {missing_cols}")
#counters to report what the import created
    created_students = 0
    created_snapshots = 0
    created_predictions = 0
# we import the prediction function only when this route is used
    from app.services.prediction_service import predict_for_student
# process each CSV row as one student record and one feature snapshot
    for _, row in df.iterrows():
        sid = None
        # try to use the original student id from the csv if provided
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
        # if the student already exists we can update their details when upsert is enabled
        elif upsert_students:
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

        # Flush so the new student and snapshot are visible before the prediction runs
        db.flush()

        if generate_predictions:
            # we can optionally generate a prediction immediately after importing the snapshot
            pred = predict_for_student(student_id=student.student_id, db=db, explain=False)
            if pred:
                created_predictions += 1
    # save the full import after all rows have been processed
    db.commit()

    # Do not fail the whole import if sequence reset fails after the data was saved
    for table, pk in (
        ("students", "student_id"),
        ("feature_snapshots", "feature_id"),
        ("predictions", "prediction_id"),
    ):
        try:
            reset_sequence(db, table, pk)
        except Exception:
            pass
    db.commit()

    return {
        "dataset_id": dataset_id,
        "early_days": None,
        "created_students": created_students,
        "created_feature_snapshots": created_snapshots,
        "created_predictions": created_predictions,
    }