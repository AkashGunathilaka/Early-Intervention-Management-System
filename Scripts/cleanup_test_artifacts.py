"""
Clean up test data left over from using the app 

this keeps the master model active and removes extra model records, and deletes uploaded datasets only when their file is missing and no students use them 
Run with:

    python -m Scripts.cleanup_test_artifacts
"""

import json
from pathlib import Path

from app.db.database import SessionLocal
from app.models.dataset import Dataset
from app.models.model_record import ModelRecord
from app.models.student import Student
from app.services.model_service import activate_model_record


# Master model files written by Notebook/data_cleaning_and_ml_core.ipynb
MASTER_MODEL_PATH = "model/final_master_model.pkl"
MASTER_FEATURE_COLUMNS_PATH = "model/final_master_feature_columns.pkl"
MASTER_MODEL_NAME = "Original Master Model"


def _ensure_master_active(db) -> ModelRecord:
    """Pick the master model (or build one) and make sure it's the active one."""
    master = (
        db.query(ModelRecord)
        .filter(ModelRecord.is_locked == True)
        .order_by(ModelRecord.model_id.asc())
        .first()
    )

    # if no model is locked, look for the one using the master model file 
    if master is None:
        master = (
            db.query(ModelRecord)
            .filter(ModelRecord.model_path.ilike("%final_master_model%"))
            .order_by(ModelRecord.model_id.asc())
            .first()
        )

    # if the database has no master row, create one using the first dataset 
    if master is None:
        seed_dataset = db.query(Dataset).order_by(Dataset.dataset_id.asc()).first()
        if seed_dataset is None:
            raise RuntimeError(
                "No master ModelRecord and no Dataset rows exist — cannot "
                "create a master ModelRecord. Re-seed the database first."
            )
        metrics = {}
        metrics_path = Path(__file__).resolve().parents[1] / "model" / "final_master_metrics.json"
        if metrics_path.exists():
            metrics = json.loads(metrics_path.read_text(encoding="utf-8"))

        master = ModelRecord(
            dataset_id=seed_dataset.dataset_id,
            model_name=MASTER_MODEL_NAME,
            version="master",
            algorithm="XGBoost",
            model_path=MASTER_MODEL_PATH,
            feature_columns_path=MASTER_FEATURE_COLUMNS_PATH,
            accuracy=metrics.get("accuracy"),
            precision=metrics.get("precision"),
            recall=metrics.get("recall"),
            f1_score=metrics.get("f1_score"),
            roc_auc=metrics.get("roc_auc"),
            is_active=False,
            is_locked=True,
        )
        db.add(master)
        db.flush()
        print(f"  Created master ModelRecord id={master.model_id}")

    master.is_locked = True
    activate_model_record(db, master)
    return master


def _delete_other_model_records(db, master_id: int) -> int:
    """Delete every ModelRecord that isn't the master. Returns count deleted."""
    others = db.query(ModelRecord).filter(ModelRecord.model_id != master_id).all()
    for record in others:
        # SQLAlchemy cascades take care of predictions and the interventions
        # attached to those predictions.
        db.delete(record)
    db.flush()
    return len(others)


def _cleanup_uploaded_datasets(db) -> tuple[int, list[tuple[int, str, int]]]:
    """
    Delete uploaded datasets that no longer have a file on disk and no students attached
    """
    project_root = Path(__file__).resolve().parents[1]
    deleted = 0
    skipped: list[tuple[int, str, int]] = []

    candidates = db.query(Dataset).filter(Dataset.source_type == "upload").all()
    for ds in candidates:
        on_disk = False
        if ds.file_path:
            p = Path(ds.file_path)
            if not p.is_absolute():
                p = project_root / p
            on_disk = p.exists()

        if on_disk:
            # File is still around — leave it alone.
            continue

        student_count = db.query(Student).filter(Student.dataset_id == ds.dataset_id).count()
        if student_count > 0:
            skipped.append((ds.dataset_id, ds.dataset_name, student_count))
            continue

        db.delete(ds)
        deleted += 1

    db.flush()
    return deleted, skipped


def main() -> None:
    db = SessionLocal()
    try:
        print("Step 1: pinning master ModelRecord as active…")
        master = _ensure_master_active(db)
        print(f"  Master: id={master.model_id} version={master.version} path={master.model_path}")

        print("Step 2: deleting non-master ModelRecord rows…")
        deleted_models = _delete_other_model_records(db, master.model_id)
        print(f"  Deleted {deleted_models} ModelRecord row(s) (and their predictions/interventions).")

        print("Step 3: cleaning up orphaned uploaded datasets…")
        deleted_ds, skipped_ds = _cleanup_uploaded_datasets(db)
        print(f"  Deleted {deleted_ds} Dataset row(s).")
        if skipped_ds:
            print("  Skipped (still has students attached — left alone):")
            for ds_id, name, n in skipped_ds:
                print(f"    - dataset_id={ds_id} name={name!r} students={n}")

        db.commit()
        print("\nCleanup committed.")
    except Exception as exc:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
