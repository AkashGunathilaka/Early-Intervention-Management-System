from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionResponse
from app.api.dependencies import get_current_active_user
from app.models.user import User
from app.services.prediction_service import predict_for_student
router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.post("/generate/{student_id}", response_model=PredictionResponse)
def create_prediction(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return predict_for_student(student_id=student_id, db=db)

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
