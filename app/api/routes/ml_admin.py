"""
Admin ML management routes
"""

from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.api.upload_paths import UPLOAD_DIR, resolve_under_uploads
from app.db.database import get_db
from app.models.dataset import Dataset
from app.models.model_record import ModelRecord
from app.models.user import User

from app.ml.trainer import train_model_from_csv, train_model_from_oulad_tables
from app.ml.predictor import clear_model_cache
from app.services.model_service import deactivate_all_models

router = APIRouter(prefix="/admin/ml", tags=["Admin - ML"])


def _register_new_active_model(
    db: Session,
    *,
    dataset_id: int,
    version: str,
    model_name: str,
    metrics: dict,
) -> ModelRecord:
    deactivate_all_models(db)
    new_model = ModelRecord(
        dataset_id=dataset_id,
        model_name=model_name,
        version=version,
        algorithm="XGBoost",
        accuracy=metrics["accuracy"],
        precision=metrics["precision"],
        recall=metrics["recall"],
        f1_score=metrics["f1_score"],
        roc_auc=metrics["roc_auc"],
        is_active=True,
        model_path=metrics["model_path"],
        feature_columns_path=metrics["feature_columns_path"],
    )
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    clear_model_cache()
    return new_model


# uploads a CSV dataset and creates a Dataset record so it can be used for retraining
@router.post("/upload-dataset")
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    # only allow CSV files because the training pipeline needs tablular CSV input
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    # add a timestamp so repeated uploads with the same name dont overwrite each other
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp}_{file.filename}"
    file_path = UPLOAD_DIR / safe_name
    # read the uploaded file and save it to disk
    content = await file.read()
    file_path.write_bytes(content)

    new_dataset = Dataset(
        dataset_name=safe_name,
        source_type="upload",
        file_path=str(file_path),
        status="uploaded",
        uploaded_by=current_user.user_id,
    )
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)

    return {
        "message": "Dataset uploaded successfully",
        "dataset_id": new_dataset.dataset_id,
        "filename": safe_name,
        "path": str(file_path),
    }


# Retrains the model from a prepared CSV feature matrix and makes the new model active
@router.post("/retrain")
def retrain_model(
    dataset_id: int,
    dataset_path: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    ds = db.query(Dataset).filter(Dataset.dataset_id == dataset_id).first()
    if ds is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    resolved_path = dataset_path or ds.file_path
    if not resolved_path:
        raise HTTPException(status_code=400, detail="No dataset_path provided and dataset has no file_path")

    csv_file = resolve_under_uploads(resolved_path)
    if not csv_file.exists():
        raise HTTPException(status_code=404, detail=f"Dataset file not found: {resolved_path}")
    # create a unique name for this training run
    version = f"v{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    # train the model and capture the returned performance metrics and artifact paths
    try:
        metrics = train_model_from_csv(str(csv_file), version=version)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {exc}")

    new_model = _register_new_active_model(
        db,
        dataset_id=dataset_id,
        version=version,
        model_name="xgboost-risk-model",
        metrics=metrics,
    )

    return {
        "message": "Model retrained successfully",
        "model_id": new_model.model_id,
        "version": new_model.version,
        "metrics": metrics,
    }


# retrains the model from raw OULAD-style tables instead of a single prepared CSV
@router.post("/retrain-oulad")
def retrain_model_oulad(
    dataset_id: int,
    student_info_path: str,
    student_vle_path: str,
    student_assessment_path: str,
    assessments_path: str,
    early_days: int = 30,
    drop_code_module: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        student_info_file = resolve_under_uploads(student_info_path)
        student_vle_file = resolve_under_uploads(student_vle_path)
        student_assessment_file = resolve_under_uploads(student_assessment_path)
        assessments_file = resolve_under_uploads(assessments_path)
    except HTTPException:
        raise
    # stop early if any files missing
    missing = [str(p) for p in [student_info_file, student_vle_file, student_assessment_file, assessments_file] if not p.exists()]
    if missing:
        raise HTTPException(status_code=404, detail=f"Missing dataset files: {missing}")
    # create a unique version name
    version = f"v{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    # train the model
    try:
        metrics = train_model_from_oulad_tables(
            student_info_path=str(student_info_file),
            student_vle_path=str(student_vle_file),
            student_assessment_path=str(student_assessment_file),
            assessments_path=str(assessments_file),
            version=version,
            early_days=early_days,
            drop_code_module=drop_code_module,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OULAD retraining failed: {exc}")

    new_model = _register_new_active_model(
        db,
        dataset_id=dataset_id,
        version=version,
        model_name="xgboost-risk-model-oulad",
        metrics=metrics,
    )

    return {
        "message": "OULAD model retrained successfully",
        "model_id": new_model.model_id,
        "version": new_model.version,
        "metrics": metrics,
    }
