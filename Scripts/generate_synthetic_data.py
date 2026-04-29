import random
from datetime import datetime

from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.dataset import Dataset
from app.models.student import Student
from app.models.feature_snapshot import FeatureSnapshot


GENERATE_PREDICTIONS = True


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def get_or_create_synthetic_dataset(db: Session) -> Dataset:
    ds = (
        db.query(Dataset)
        .filter(Dataset.dataset_name == "Synthetic Dataset")
        .first()
    )
    if ds:
        return ds

    

    from app.models.user import User  # local import to avoid circulars

    user = db.query(User).order_by(User.user_id.asc()).first()
    if not user:
        raise RuntimeError(
            "No users exist in DB. Create an admin user first, then rerun."
        )

    ds = Dataset(
        dataset_name="Synthetic Dataset",
        source_type="synthetic",
        status="active",
        uploaded_by=user.user_id,
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return ds


def synthetic_student_row(dataset_id: int) -> Student:
    code_module = random.choice(["AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG"])
    code_presentation = random.choice(["2013B", "2013J", "2014B", "2014J"])
    gender = random.choice(["M", "F"])
    region = random.choice(
        ["London Region", "East Anglian Region", "Scotland", "North Western Region", "South East Region"]
    )
    highest_education = random.choice(
        ["No Formal quals", "Lower Than A Level", "A Level or Equivalent", "HE Qualification", "Post Graduate Qualification"]
    )
    imd_band = random.choice(
        ["0-10%", "10-20", "20-30%", "30-40%", "40-50%", "50-60%", "60-70%", "70-80%", "80-90%", "90-100%", "Unknown"]
    )
    age_band = random.choice(["0-35", "35-55", "55<="])
    num_of_prev_attempts = random.choice([0, 1, 2, 3])
    studied_credits = random.choice([30, 60, 90, 120])
    disability = random.choice(["Y", "N"])

    return Student(
        dataset_id=dataset_id,
        code_module=code_module,
        code_presentation=code_presentation,
        gender=gender,
        region=region,
        highest_education=highest_education,
        imd_band=imd_band,
        age_band=age_band,
        num_of_prev_attempts=num_of_prev_attempts,
        studied_credits=studied_credits,
        disability=disability,
    )


def synthetic_snapshot(days_from_start: int, persona: str) -> FeatureSnapshot:
    """
    persona in {"low", "medium", "high"} controls plausible ranges.
    This intentionally injects correlation so the ML workflow produces non-trivial outputs.
    It should not be used to validate real-world model performance.
    """
    if persona == "high":  # high risk: low engagement + low assessment
        total_clicks = random.uniform(10, 80)
        vle_records = random.randint(3, 15)
        assessment_count = random.randint(0, 1)
        avg_score = random.uniform(0, 45)
    elif persona == "medium":
        total_clicks = random.uniform(60, 180)
        vle_records = random.randint(10, 35)
        assessment_count = random.randint(1, 3)
        avg_score = random.uniform(40, 70)
    else:  
        total_clicks = random.uniform(150, 450)
        vle_records = random.randint(25, 90)
        assessment_count = random.randint(2, 5)
        avg_score = random.uniform(65, 95)

    avg_clicks = total_clicks / max(vle_records, 1)

    # simple derived values
    total_score = avg_score * max(assessment_count, 1)
    avg_weight = random.uniform(10, 40)

    # optional "ground truth" label for your own evaluation (not required)
    at_risk_label = {"high": 1, "medium": 0, "low": 0}.get(persona)

    return FeatureSnapshot(
        days_from_start=days_from_start,
        total_clicks=float(round(total_clicks, 2)),
        avg_clicks=float(round(avg_clicks, 2)),
        vle_records=int(vle_records),
        avg_score=float(round(avg_score, 2)),
        total_score=float(round(total_score, 2)),
        assessment_count=int(assessment_count),
        avg_weight=float(round(avg_weight, 2)),
        at_risk_label=at_risk_label,
    )


def main(count: int = 100) -> None:
    db = SessionLocal()
    try:
        ds = get_or_create_synthetic_dataset(db)

        created_student_ids = [s.student_id for s in db.query(Student).filter(Student.dataset_id == ds.dataset_id).all()]

 
        
        if GENERATE_PREDICTIONS:
            from app.services.prediction_service import predict_for_student
            from app.models.prediction import Prediction
            for sid in created_student_ids:
                exists = (
                    db.query(Prediction.prediction_id)
                    .filter(Prediction.student_id == sid)
                    .first()
                )
                if not exists:
                    predict_for_student(student_id=sid, db=db)

        print(
            f"Inserted {len(created_student_ids)} students into dataset_id={ds.dataset_id} "
            f"({ds.dataset_name}) at {datetime.utcnow().isoformat()}Z"
        )
    finally:
        db.close()


if __name__ == "__main__":
    main(count=100)