from pathlib import Path
import json
import shutil

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.db.database import get_db
from app.models.model_record import ModelRecord
from app.models.user import User
from app.schemas.model_record import ModelRecordResponse

router = APIRouter(prefix="/admin/models", tags=["Admin - Models"])

BASE_DIR = Path(__file__).resolve().parents[3]

class MasterizeFromNotebookRequest(BaseModel):
    dataset_id: int
    model_name: str = "Master XGBoost Model"
    algorithm: str = "XGBoost"
    set_active: bool = True


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


@router.post("/masterize-from-notebook", response_model=ModelRecordResponse)
def masterize_from_notebook(
    payload: MasterizeFromNotebookRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Register notebook-exported artifacts as the locked 'master' model.

    Expects notebook to have exported:
    - model/final_xgb_model.pkl
    - model/final_feature_columns.pkl
    - model/final_metrics.json (optional but recommended)
    """
    src_dir = BASE_DIR / "model"
    src_model = src_dir / "final_xgb_model.pkl"
    src_cols = src_dir / "final_feature_columns.pkl"
    src_metrics = src_dir / "final_metrics.json"

    if not src_model.exists():
        raise HTTPException(status_code=404, detail=f"Missing notebook export: {src_model}")
    if not src_cols.exists():
        raise HTTPException(status_code=404, detail=f"Missing notebook export: {src_cols}")

    master_dir = src_dir / "master"
    master_dir.mkdir(parents=True, exist_ok=True)

    # Copy into a stable master location used by the registry
    dst_model = master_dir / "model.pkl"
    dst_cols = master_dir / "feature_columns.pkl"
    dst_metrics = master_dir / "metrics.json"

    shutil.copy2(src_model, dst_model)
    shutil.copy2(src_cols, dst_cols)

    metrics_data: dict | None = None
    if src_metrics.exists():
        try:
            metrics_data = json.loads(src_metrics.read_text(encoding="utf-8"))
            dst_metrics.write_text(json.dumps(metrics_data, indent=2), encoding="utf-8")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to read/write metrics JSON: {exc}")

    # Optional: deactivate current active model if desired
    if payload.set_active:
        db.query(ModelRecord).filter(ModelRecord.is_active == True).update(
            {"is_active": False},
            synchronize_session=False,
        )

    master = (
        db.query(ModelRecord)
        .filter(ModelRecord.version == "master")
        .filter(ModelRecord.is_locked == True)
        .first()
    )

    accuracy = metrics_data.get("accuracy") if metrics_data else None
    precision = metrics_data.get("precision") if metrics_data else None
    recall = metrics_data.get("recall") if metrics_data else None
    f1_score = metrics_data.get("f1_score") if metrics_data else None
    roc_auc = metrics_data.get("roc_auc") if metrics_data else None

    if master is None:
        master = ModelRecord(
            dataset_id=payload.dataset_id,
            model_name=payload.model_name,
            version="master",
            algorithm=payload.algorithm,
            accuracy=accuracy,
            precision=precision,
            recall=recall,
            f1_score=f1_score,
            roc_auc=roc_auc,
            is_active=payload.set_active,
            is_locked=True,
            model_path=str(Path("model") / "master" / "model.pkl"),
            feature_columns_path=str(Path("model") / "master" / "feature_columns.pkl"),
        )
        db.add(master)
        db.commit()
        db.refresh(master)
        return master

    # Update master record paths/metrics (still locked; this endpoint is the only way to refresh it)
    master.dataset_id = payload.dataset_id
    master.model_name = payload.model_name
    master.algorithm = payload.algorithm
    master.model_path = str(Path("model") / "master" / "model.pkl")
    master.feature_columns_path = str(Path("model") / "master" / "feature_columns.pkl")
    master.accuracy = accuracy
    master.precision = precision
    master.recall = recall
    master.f1_score = f1_score
    master.roc_auc = roc_auc
    if payload.set_active:
        master.is_active = True

    db.commit()
    db.refresh(master)
    return master


@router.delete("/{model_id}")
def delete_model(
    model_id: int,
    delete_artifacts: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Delete a model record safely.

    Rules:
    - Cannot delete locked models
    - Cannot delete the active model
    - Optionally deletes artifact files if they are inside `model/artifacts/`
    """
    model = db.query(ModelRecord).filter(ModelRecord.model_id == model_id).first()
    if model is None:
        raise HTTPException(status_code=404, detail="Model not found")

    if getattr(model, "is_locked", False):
        raise HTTPException(status_code=400, detail="Locked master models cannot be deleted")
    if model.is_active:
        raise HTTPException(status_code=400, detail="Active model cannot be deleted (activate another model first)")

    # Resolve artifact dir (best-effort) and only delete if it's under model/artifacts/
    deleted_paths: list[str] = []
    if delete_artifacts and model.model_path:
        model_path = Path(model.model_path)
        if not model_path.is_absolute():
            model_path = BASE_DIR / model_path

        artifact_dir = model_path.parent
        artifacts_root = (BASE_DIR / "model" / "artifacts").resolve()
        try:
            artifact_dir_resolved = artifact_dir.resolve()
            if artifacts_root in artifact_dir_resolved.parents:
                # delete the whole version folder
                if artifact_dir_resolved.exists():
                    shutil.rmtree(artifact_dir_resolved)
                    deleted_paths.append(str(artifact_dir_resolved))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to delete artifacts: {exc}")

    db.delete(model)
    db.commit()

    return {"message": "Model deleted", "model_id": model_id, "deleted_artifacts": deleted_paths}


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