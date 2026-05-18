"""
This file is for managing existing model records
"""

from pathlib import Path
import json
import shutil

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.db.database import get_db
from app.models.model_record import ModelRecord
from app.models.user import User
from app.schemas.model_record import ModelRecordResponse

#group together
router = APIRouter(prefix="/admin/models", tags=["Admin - Models"])


#project root used to safely resolve relative model artifact paths.
BASE_DIR = Path(__file__).resolve().parents[3]


def _metrics_json_candidates(model_path: Path) -> list[Path]:
    """Paths where training may have saved metrics (master vs retrain layouts differ)."""
    artifact_dir = model_path.parent
    candidates = [artifact_dir / "metrics.json"]
    if model_path.name == "final_master_model.pkl":
        candidates.insert(0, artifact_dir / "final_master_metrics.json")
    elif model_path.name.endswith("_model.pkl"):
        candidates.insert(0, artifact_dir / model_path.name.replace("_model.pkl", "_metrics.json"))
    return candidates


def _metrics_from_db_row(model: ModelRecord) -> dict | None:
    if model.accuracy is None and model.f1_score is None and model.roc_auc is None:
        return None
    return {
        "accuracy": model.accuracy,
        "precision": model.precision,
        "recall": model.recall,
        "f1_score": model.f1_score,
        "roc_auc": model.roc_auc,
        "source": "database",
    }


def _load_metrics_for_model(model: ModelRecord) -> dict:
    if not model.model_path:
        raise HTTPException(status_code=404, detail="Model artifact path missing")

    model_path = Path(model.model_path)
    if not model_path.is_absolute():
        model_path = BASE_DIR / model_path

    for metrics_path in _metrics_json_candidates(model_path):
        if metrics_path.exists():
            try:
                with open(metrics_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"Failed to read {metrics_path.name}: {exc}")

    from_db = _metrics_from_db_row(model)
    if from_db is not None:
        return from_db

    tried = ", ".join(p.name for p in _metrics_json_candidates(model_path))
    raise HTTPException(
        status_code=404,
        detail=f"No metrics file found for model_id={model.model_id} (looked for {tried})",
    )


# Lists all trained model records
@router.get("/", response_model=list[ModelRecordResponse])
def list_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    #return the model records ordered by ID so the latest training runs appear first.
    return db.query(ModelRecord).order_by(ModelRecord.model_id.desc()).all()


# Return the model currently marked as active for runtime prediction
@router.get("/active", response_model=ModelRecordResponse)
def get_active_model(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    model = db.query(ModelRecord).filter(ModelRecord.is_active == True).first()
    if model is None:
        raise HTTPException(status_code=404, detail="No active model found")
    return model


# Makes the selected model active and deactivates the previously active model
@router.put("/activate/{model_id}", response_model=ModelRecordResponse)
def activate_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    target = db.query(ModelRecord).filter(ModelRecord.model_id == model_id).first()
    # stop early if target is none
    if target is None:
        raise HTTPException(status_code=404, detail="Model not found")

    # turn of all active models first so only one model is live at a time
    db.query(ModelRecord).filter(ModelRecord.is_active == True).update(
        {"is_active": False},
        synchronize_session=False,
    )

    target.is_active = True
    db.commit()
    db.refresh(target)

    return target


# Guardrails , deletes a non active , non-locked model record and optionally removes its saved artefacts
@router.delete("/{model_id}")
def delete_model(
    model_id: int,
    delete_artifacts: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    # find the model record that should be deleted
    model = db.query(ModelRecord).filter(ModelRecord.model_id == model_id).first()
    if model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    # prevents the master model from accidental deletion
    if getattr(model, "is_locked", False):
        raise HTTPException(status_code=400, detail="Locked master models cannot be deleted")
    # active model cannot be deleted either
    if model.is_active:
        raise HTTPException(status_code=400, detail="Active model cannot be deleted (activate another model first)")

    deleted_paths: list[str] = []
    if delete_artifacts and model.model_path:
        model_path = Path(model.model_path)
        if not model_path.is_absolute():
            model_path = BASE_DIR / model_path

        artifact_dir = model_path.parent
        artifacts_root = (BASE_DIR / "model" / "artifacts").resolve()
        try:
            # resolve the artifact directory before checking whether it is safe to delete
            artifact_dir_resolved = artifact_dir.resolve()
            if artifacts_root in artifact_dir_resolved.parents:
                if artifact_dir_resolved.exists():
                    # Delete the whole version folder including the model file and related data
                    shutil.rmtree(artifact_dir_resolved)
                    deleted_paths.append(str(artifact_dir_resolved))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to delete artifacts: {exc}")

    db.delete(model)
    db.commit()

    return {"message": "Model deleted", "model_id": model_id, "deleted_artifacts": deleted_paths}


# Reads the metrics.josn file saved beside a model artifact.
@router.get("/{model_id}/metrics-file")
def get_model_metrics_file(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    #Find the model
    model = db.query(ModelRecord).filter(ModelRecord.model_id == model_id).first()
    if model is None:
        raise HTTPException(status_code=404, detail="Model not found")

    return _load_metrics_for_model(model)