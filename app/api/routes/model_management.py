from pathlib import Path
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.db.database import get_db
from app.models.model_record import ModelRecord
from app.models.user import User
from app.schemas.model_record import ModelRecordResponse

router = APIRouter(prefix="/admin/models", tags=["Admin - Models"])

BASE_DIR = Path(__file__).resolve().parents[3]


@router.get("/", response_model=list[ModelRecordResponse])
def list_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return db.query(ModelRecord).order_by(ModelRecord.model_id.desc()).all()


@router.get("/active", response_model=ModelRecordResponse)
def get_active_model(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    model = db.query(ModelRecord).filter(ModelRecord.is_active == True).first()
    if model is None:
        raise HTTPException(status_code=404, detail="No active model found")
    return model


@router.put("/activate/{model_id}", response_model=ModelRecordResponse)
def activate_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    target = db.query(ModelRecord).filter(ModelRecord.model_id == model_id).first()
    if target is None:
        raise HTTPException(status_code=404, detail="Model not found")

    db.query(ModelRecord).filter(ModelRecord.is_active == True).update(
        {"is_active": False},
        synchronize_session=False,
    )

    target.is_active = True
    db.commit()
    db.refresh(target)

    return target


@router.get("/{model_id}/metrics-file")
def get_model_metrics_file(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    model = db.query(ModelRecord).filter(ModelRecord.model_id == model_id).first()
    if model is None:
        raise HTTPException(status_code=404, detail="Model not found")

    if not model.model_path:
        raise HTTPException(status_code=404, detail="Model artifact path missing")

    model_path = Path(model.model_path)
    if not model_path.is_absolute():
        model_path = BASE_DIR / model_path

    artifact_dir = model_path.parent
    metrics_path = artifact_dir / "metrics.json"
    if not metrics_path.exists():
        raise HTTPException(status_code=404, detail=f"metrics.json not found for model_id={model_id}")

    try:
        with open(metrics_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read metrics.json: {exc}")