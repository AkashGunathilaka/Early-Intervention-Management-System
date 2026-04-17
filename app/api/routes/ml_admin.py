from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.db.database import get_db
from app.models.model_record import ModelRecord
from app.models.user import User

from app.ml.trainer import train_model_from_csv, train_model_from_oulad_tables
from app.ml.predictor import clear_model_cache


router = APIRouter(prefix="/admin/ml", tags=["Admin - ML"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload-dataset")
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp}_{file.filename}"
    file_path = UPLOAD_DIR / safe_name

    content = await file.read()
    file_path.write_bytes(content)

    return {
        "message": "Dataset uploaded successfully",
        "filename": safe_name,
        "path": str(file_path),
    }


@router.post("/retrain")
def retrain_model(
    dataset_id: int,
    dataset_path: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    csv_file = Path(dataset_path)
    if not csv_file.exists():
        raise HTTPException(status_code=404, detail=f"Dataset file not found: {dataset_path}")
    version = f"v{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    try:
        metrics = train_model_from_csv(str(csv_file), version=version)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {exc}")

    db.query(ModelRecord).filter(ModelRecord.is_active == True).update(
        {"is_active": False},
        synchronize_session=False,
    )

    new_model = ModelRecord(
        dataset_id=dataset_id,
        model_name="xgboost-risk-model",
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

    return {
        "message": "Model retrained successfully",
        "model_id": new_model.model_id,
        "version": new_model.version,
        "metrics": metrics,
    }
    
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
    # Validate all file paths exist
    input_paths = [
        student_info_path,
        student_vle_path,
        student_assessment_path,
        assessments_path,
    ]
    missing_paths = [p for p in input_paths if not Path(p).exists()]
    if missing_paths:
        raise HTTPException(
            status_code=404,
            detail=f"Missing dataset files: {missing_paths}",
        )

    version = f"v{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    try:
        metrics = train_model_from_oulad_tables(
            student_info_path=student_info_path,
            student_vle_path=student_vle_path,
            student_assessment_path=student_assessment_path,
            assessments_path=assessments_path,
            version=version,
            early_days=early_days,
            drop_code_module=drop_code_module,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OULAD retraining failed: {exc}")

    # Deactivate current active model
    db.query(ModelRecord).filter(ModelRecord.is_active == True).update(
        {"is_active": False},
        synchronize_session=False,
    )

    # Insert new active model record
    new_model = ModelRecord(
        dataset_id=dataset_id,
        model_name="xgboost-risk-model-oulad",
        version=version,
        algorithm="XGBoost",
        accuracy=metrics["accuracy"],
        precision=metrics["precision"],
        recall=metrics["recall"],
        f1_score=metrics["f1_score"],
        roc_auc=metrics["roc_auc"],
        model_path=metrics["model_path"],
        feature_columns_path=metrics["feature_columns_path"],
        is_active=True,
    )

    db.add(new_model)
    db.commit()
    db.refresh(new_model)

    clear_model_cache()

    return {
        "message": "OULAD model retrained successfully",
        "model_id": new_model.model_id,
        "version": new_model.version,
        "metrics": metrics,
    }