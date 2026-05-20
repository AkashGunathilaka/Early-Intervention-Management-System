from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.ml.predictor import clear_model_cache
from app.models.model_record import ModelRecord


def deactivate_all_models(db: Session) -> None:
    db.query(ModelRecord).filter(ModelRecord.is_active == True).update(
        {"is_active": False},
        synchronize_session=False,
    )


def activate_model_record(db: Session, model: ModelRecord) -> ModelRecord:
    deactivate_all_models(db)
    model.is_active = True
    db.commit()
    db.refresh(model)
    clear_model_cache()
    return model


def activate_model_by_id(db: Session, model_id: int) -> ModelRecord:
    target = db.query(ModelRecord).filter(ModelRecord.model_id == model_id).first()
    if target is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return activate_model_record(db, target)
