from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.db.database import get_db
from app.models.model_record import ModelRecord
from app.models.user import User

from app.ml.trainer import train_model_from_csv
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
    