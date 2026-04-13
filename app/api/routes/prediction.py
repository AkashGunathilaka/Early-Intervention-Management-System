from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.feature_snapshot import FeatureSnapshot
from app.models.model_record import ModelRecord
from app.models.prediction import Prediction
from app.ml.predictor import generate_prediction
from app.schemas.prediction import PredictionResponse
from app.api.dependencies import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.post("/generate/{feature_id}", response_model=PredictionResponse)
def create_prediction(feature_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    feature_snapshot = (
        db.query(FeatureSnapshot)
        .filter(FeatureSnapshot.feature_id == feature_id)
        .first()
    )

    if feature_snapshot is None:
        raise HTTPException(status_code=404, detail="Feature snapshot not found")

    active_model = (
        db.query(ModelRecord)
        .filter(ModelRecord.is_active == True)
        .first()
    )

    if active_model is None:
        raise HTTPException(status_code=404, detail="No active model found")

    prediction_result = generate_prediction(feature_snapshot)

    new_prediction = Prediction(
        student_id=feature_snapshot.student_id,
        feature_id=feature_snapshot.feature_id,
        model_id=active_model.model_id,
        risk_score=prediction_result["risk_score"],
        predicted_label=prediction_result["predicted_label"],
        risk_level=prediction_result["risk_level"],
        confidence_score=prediction_result["confidence_score"],
        top_factors=prediction_result["top_factors"],
    )

    db.add(new_prediction)
    db.commit()
    db.refresh(new_prediction)

    return new_prediction


@router.get("/", response_model=list[PredictionResponse])
def get_predictions(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return db.query(Prediction).all()


@router.get("/{prediction_id}", response_model=PredictionResponse)
def get_prediction(prediction_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    prediction = (
        db.query(Prediction)
        .filter(Prediction.prediction_id == prediction_id)
        .first()
    )

    if prediction is None:
        raise HTTPException(status_code=404, detail="Prediction not found")

    return prediction


@router.get("/student/{student_id}", response_model=list[PredictionResponse])
def get_predictions_for_student(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return (
        db.query(Prediction)
        .filter(Prediction.student_id == student_id)
        .all()
    )