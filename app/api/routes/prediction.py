from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionResponse
from app.schemas.prediction_compare import PredictionCompareResponse
from app.api.dependencies import get_current_active_user, require_admin
from app.models.user import User
from app.services.prediction_service import predict_for_student
from app.models.student import Student
router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.post("/generate/{student_id}", response_model=PredictionResponse)
def create_prediction(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return predict_for_student(student_id=student_id, db=db)


@router.post("/generate-dataset/{dataset_id}")
def generate_predictions_for_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Bulk-generate predictions for all students in a dataset (uses each student's latest snapshot).
    Admin-only because it can be expensive and changes many rows.
    """
    student_ids = [sid for (sid,) in db.query(Student.student_id).filter(Student.dataset_id == dataset_id).all()]
    if not student_ids:
        return {"dataset_id": dataset_id, "attempted": 0, "generated": 0, "failed": 0}

    generated = 0
    failed = 0
    for sid in student_ids:
        try:
            # Explanations (e.g., SHAP) are intentionally skipped here to keep bulk runs fast.
            # Use per-student regeneration for detailed explanations.
            predict_for_student(student_id=int(sid), db=db, explain=False)
            generated += 1
        except Exception:
            # keep going; report failure count
            failed += 1

    return {"dataset_id": dataset_id, "attempted": len(student_ids), "generated": generated, "failed": failed}

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


@router.get("/compare/{student_id}", response_model=PredictionCompareResponse)
def compare_latest_predictions(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    preds = (
        db.query(Prediction)
        .filter(Prediction.student_id == student_id)
        .order_by(Prediction.prediction_id.desc())
        .limit(2)
        .all()
    )

    latest = preds[0] if len(preds) >= 1 else None
    previous = preds[1] if len(preds) >= 2 else None

    delta = None
    if latest is not None and previous is not None:
        delta = float(latest.risk_score) - float(previous.risk_score)

    return {"latest": latest, "previous": previous, "delta_risk_score": delta}
