# prediction service to keep the main prediction logic in one place
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.feature_snapshot import FeatureSnapshot
from app.models.model_record import ModelRecord
from app.models.student import Student
from app.models.prediction import Prediction
from app.ml.predictor import generate_prediction
from app.services.risk import get_risk_thresholds, risk_level_from_score


def predict_for_student(student_id: int, db: Session, *, explain: bool = True) -> Prediction:
    # generate and save a prediction for one student
    feature_snapshot = (
        db.query(FeatureSnapshot)
        .filter(FeatureSnapshot.student_id == student_id)
        .order_by(FeatureSnapshot.feature_id.desc())
        .first()
    )

    if feature_snapshot is None:
        raise HTTPException(
            status_code=404,
            detail="No feature snapshot found for this student",
        )

    student = db.query(Student).filter(Student.student_id == student_id).first()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

# get the active model
    active_model = (
        db.query(ModelRecord)
        .filter(ModelRecord.is_active == True)
        .first()
    )

    if active_model is None:
        raise HTTPException(status_code=404, detail="No active model found")

    if not active_model.model_path or not active_model.feature_columns_path:
        raise HTTPException(
            status_code=500,
        detail="Active model artifact paths are missing",
        )

    prediction_result = generate_prediction(
        feature_snapshot,
        student,
        model_path=active_model.model_path,
        feature_columns_path=active_model.feature_columns_path,
    )

    high_threshold, medium_threshold = get_risk_thresholds(db)
    risk_score = prediction_result["risk_score"]
    risk_level = risk_level_from_score(
        risk_score,
        high_threshold=high_threshold,
        medium_threshold=medium_threshold,
    )

    # saves the prediction 
    new_prediction = Prediction(
        student_id=feature_snapshot.student_id,
        feature_id=feature_snapshot.feature_id,
        model_id=active_model.model_id,
        risk_score=prediction_result["risk_score"],
        predicted_label=prediction_result["predicted_label"],
        risk_level=risk_level,
        confidence_score=prediction_result["confidence_score"],
        top_factors=prediction_result["top_factors"] if explain else None,
    )

    db.add(new_prediction)
    db.commit()
    db.refresh(new_prediction)

    return new_prediction