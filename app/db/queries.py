from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.prediction import Prediction
from app.models.student import Student


def latest_prediction_ids_subquery(
    db: Session,
    *,
    dataset_id: int | None = None,
    student_ids: list[int] | None = None,
):
    q = db.query(
        Prediction.student_id,
        func.max(Prediction.prediction_id).label("max_pid"),
    ).group_by(Prediction.student_id)

    if dataset_id is not None:
        q = q.join(Student, Student.student_id == Prediction.student_id).filter(
            Student.dataset_id == dataset_id
        )

    if student_ids is not None:
        q = q.filter(Prediction.student_id.in_(student_ids))

    return q.subquery()


def latest_risk_level_counts(db: Session, *, dataset_id: int | None = None) -> dict[str, int]:
    latest_pred_ids = latest_prediction_ids_subquery(db, dataset_id=dataset_id)
    rows = (
        db.query(Prediction.risk_level, func.count(Prediction.prediction_id))
        .join(latest_pred_ids, Prediction.prediction_id == latest_pred_ids.c.max_pid)
        .group_by(Prediction.risk_level)
        .all()
    )

    counts = {"High": 0, "Medium": 0, "Low": 0}
    for level, count in rows:
        counts[level] = count
    return counts


def fetch_latest_predictions_for_students(
    db: Session,
    student_ids: list[int],
) -> dict[int, Prediction]:
    if not student_ids:
        return {}

    latest_pred_ids = latest_prediction_ids_subquery(db, student_ids=student_ids)
    latest_preds = (
        db.query(Prediction)
        .join(latest_pred_ids, Prediction.prediction_id == latest_pred_ids.c.max_pid)
        .all()
    )
    return {p.student_id: p for p in latest_preds}
