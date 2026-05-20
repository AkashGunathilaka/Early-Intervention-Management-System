from sqlalchemy.orm import Session

from app.models.risk_threshold import RiskThreshold

DEFAULT_HIGH_THRESHOLD = 0.7
DEFAULT_MEDIUM_THRESHOLD = 0.4


def get_risk_thresholds(db: Session) -> tuple[float, float]:
    threshold = db.query(RiskThreshold).first()
    high = threshold.high_threshold if threshold else DEFAULT_HIGH_THRESHOLD
    medium = threshold.medium_threshold if threshold else DEFAULT_MEDIUM_THRESHOLD
    return high, medium


def risk_level_from_score(
    risk_score: float,
    *,
    high_threshold: float,
    medium_threshold: float,
) -> str:
    if risk_score >= high_threshold:
        return "High"
    if risk_score >= medium_threshold:
        return "Medium"
    return "Low"
