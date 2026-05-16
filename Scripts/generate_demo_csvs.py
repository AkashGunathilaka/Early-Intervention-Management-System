# generates two sample csv files for testing in the uploads directory 
# one for students with feature snapshots and one for retraining data 


from __future__ import annotations

import csv
import random
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
UPLOADS_DIR = BASE_DIR / "uploads"


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def _rnd(rng: random.Random, a: float, b: float, digits: int = 3) -> float:
    return round(rng.uniform(a, b), digits)


@dataclass(frozen=True)
class StudentRow:
    student_id: int
    first_name: str
    last_name: str
    email: str
    date_of_birth: str
    gender: str
    code_module: str
    code_presentation: str
    region: str
    highest_education: str
    imd_band: str
    age_band: str
    disability: str


@dataclass(frozen=True)
class SnapshotRow:
    days_from_start: int
    num_of_prev_attempts: int
    studied_credits: int
    engagement_index: float
    days_active: int
    avg_session_duration: float
    total_clicks: int
    avg_clicks: float
    vle_records: int
    assessment_count: int
    avg_score: float
    score_std: float
    score_trend: float
    submission_delay_mean: float
    submission_delay_std: float
    total_score: float
    avg_weight: float


def _make_student(rng: random.Random, student_id: int) -> StudentRow:
    first_names = ["Akash", "Sam", "Alex", "Jamie", "Taylor", "Jordan", "Casey", "Riley", "Morgan", "Avery"]
    last_names = ["Perera", "Silva", "Fernando", "Smith", "Khan", "Patel", "Brown", "Jones", "Garcia", "Lee"]

    first = rng.choice(first_names)
    last = rng.choice(last_names)
    email = f"student{student_id}@example.com"

    # keep the generated students around the age of university students
    start = date(1990, 1, 1)
    dob = start + timedelta(days=rng.randint(0, 365 * 15))

    gender = rng.choice(["M", "F"])
    code_module = rng.choice(["AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG"])
    code_presentation = rng.choice(["2013J", "2013B", "2014J", "2014B"])
    region = rng.choice(["London", "South East", "North West", "Scotland", "Wales", "East Midlands"])
    highest_education = rng.choice(["A Level or Equivalent", "HE Qualification", "Lower Than A Level", "Post Graduate Qualification"])
    imd_band = rng.choice(["0-10%", "10-20%", "20-30%", "30-40%", "40-50%", "50-60%", "60-70%", "70-80%", "80-90%", "90-100%"])
    age_band = rng.choice(["0-35", "35-55", "55<="])
    disability = rng.choice(["Y", "N"])

    return StudentRow(
        student_id=student_id,
        first_name=first,
        last_name=last,
        email=email,
        date_of_birth=dob.isoformat(),
        gender=gender,
        code_module=code_module,
        code_presentation=code_presentation,
        region=region,
        highest_education=highest_education,
        imd_band=imd_band,
        age_band=age_band,
        disability=disability,
    )


def _make_snapshot(rng: random.Random) -> SnapshotRow:
    days_from_start = rng.choice([0, 7, 14, 21, 28, 35, 42])
    num_prev = rng.randint(0, 4)
    studied_credits = rng.choice([30, 60, 90, 120])

    engagement_index = _rnd(rng, 0.0, 1.0, 3)
    days_active = int(round(_clamp(rng.gauss(18, 7), 0, 60)))
    avg_session_duration = _rnd(rng, 2.0, 65.0, 2)

    total_clicks = int(round(_clamp(rng.gauss(900, 500), 0, 5000)))
    # treat this as the number of VLE records for the student
    vle_records = int(round(_clamp(rng.gauss(max(1, days_active), 8), 1, 200)))
    avg_clicks = round(total_clicks / max(1, vle_records), 3) if total_clicks > 0 else 0.0

    assessment_count = rng.randint(0, 12)
    avg_score = _rnd(rng, 35.0, 95.0, 2) if assessment_count > 0 else 0.0
    score_std = _rnd(rng, 0.0, 20.0, 2) if assessment_count > 1 else 0.0
    score_trend = _rnd(rng, -2.5, 2.5, 3) if assessment_count > 1 else 0.0

    submission_delay_mean = _rnd(rng, -10.0, 15.0, 2) if assessment_count > 0 else 0.0
    submission_delay_std = _rnd(rng, 0.0, 10.0, 2) if assessment_count > 1 else 0.0

    # keep these tied to the generated assessment values
    total_score = round(avg_score * assessment_count, 3)
    avg_weight = _rnd(rng, 5.0, 40.0, 3) if assessment_count > 0 else 0.0

    return SnapshotRow(
        days_from_start=days_from_start,
        num_of_prev_attempts=num_prev,
        studied_credits=studied_credits,
        engagement_index=engagement_index,
        days_active=days_active,
        avg_session_duration=avg_session_duration,
        total_clicks=total_clicks,
        avg_clicks=avg_clicks,
        vle_records=vle_records,
        assessment_count=assessment_count,
        avg_score=avg_score,
        score_std=score_std,
        score_trend=score_trend,
        submission_delay_mean=submission_delay_mean,
        submission_delay_std=submission_delay_std,
        total_score=total_score,
        avg_weight=avg_weight,
    )


def _risk_label(s: SnapshotRow) -> int:
    """
Create a simple risk label for the sample rows

lower engagement, lower marks, late submissions and low activity all push towards at risk

    """
    risk = 0.0
    risk += (1.0 - _clamp(s.engagement_index, 0.0, 1.0)) * 2.0
    risk += (1.0 - _clamp(s.avg_score / 100.0 if s.avg_score else 0.0, 0.0, 1.0)) * 2.2
    risk += _clamp((s.submission_delay_mean + 5.0) / 25.0, 0.0, 1.0) * 1.3
    risk += _clamp((10.0 - s.days_active) / 10.0, 0.0, 1.0) * 1.0
    return 1 if risk >= 3.2 else 0


def write_students_import_csv(path: Path, *, n: int = 100, seed: int = 42) -> None:
    rng = random.Random(seed)
    path.parent.mkdir(parents=True, exist_ok=True)

    # keep the column names consistent with the bulk importer
    fieldnames = [
        "student_id",
        "first_name",
        "last_name",
        "email",
        "date_of_birth",
        "gender",
        "code_module",
        "code_presentation",
        "region",
        "highest_education",
        "imd_band",
        "age_band",
        "disability",
        "days_from_start",
        "num_of_prev_attempts",
        "studied_credits",
        "engagement_index",
        "days_active",
        "avg_session_duration",
        "total_clicks",
        "avg_clicks",
        "vle_records",
        "assessment_count",
        "avg_score",
        "score_std",
        "score_trend",
        "submission_delay_mean",
        "submission_delay_std",
        "total_score",
        "avg_weight",
        "at_risk_label",
    ]

    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for i in range(n):
            sid = i + 1
            student = _make_student(rng, sid)
            snap = _make_snapshot(rng)
            row = {**student.__dict__, **snap.__dict__, "at_risk_label": _risk_label(snap)}
            w.writerow(row)


def write_retrain_csv(path: Path, *, n: int = 100, seed: int = 99) -> None:
    rng = random.Random(seed)
    path.parent.mkdir(parents=True, exist_ok=True)

    # retraining only needs model features and the label
    fieldnames = [
        "student_id",
        "days_from_start",
        "num_of_prev_attempts",
        "studied_credits",
        "engagement_index",
        "days_active",
        "avg_session_duration",
        "total_clicks",
        "avg_clicks",
        "vle_records",
        "assessment_count",
        "avg_score",
        "score_std",
        "score_trend",
        "submission_delay_mean",
        "submission_delay_std",
        "total_score",
        "avg_weight",
        "at_risk_label",
    ]

    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for i in range(n):
            sid = i + 1
            snap = _make_snapshot(rng)
            label = _risk_label(snap)
            w.writerow(
                {
                    "student_id": sid,
                    **snap.__dict__,
                    "at_risk_label": label,
                }
            )


def main() -> None:
    students_path = UPLOADS_DIR / "students_import_100.csv"
    retrain_path = UPLOADS_DIR / "retrain_dataset_100.csv"

    write_students_import_csv(students_path, n=100)
    write_retrain_csv(retrain_path, n=100)

    print(f"Wrote {students_path.relative_to(BASE_DIR)}")
    print(f"Wrote {retrain_path.relative_to(BASE_DIR)}")


if __name__ == "__main__":
    main()

