from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.db.database import get_db
from app.models.risk_threshold import RiskThreshold
from app.models.user import User
from app.schemas.risk_threshold import RiskThresholdResponse, RiskThresholdUpdate

router = APIRouter(prefix="/admin/risk-thresholds", tags=["Admin - Risk Thresholds"])


@router.get("/", response_model=RiskThresholdResponse)
def get_thresholds(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    threshold = db.query(RiskThreshold).first()
    if threshold is None:
        threshold = RiskThreshold(high_threshold=0.7, medium_threshold=0.4)
        db.add(threshold)
        db.commit()
        db.refresh(threshold)
    return threshold


@router.put("/", response_model=RiskThresholdResponse)
def update_thresholds(
    payload: RiskThresholdUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if payload.medium_threshold >= payload.high_threshold:
        raise HTTPException(
            status_code=400,
            detail="medium_threshold must be less than high_threshold",
        )

    threshold = db.query(RiskThreshold).first()
    if threshold is None:
        threshold = RiskThreshold(
            high_threshold=payload.high_threshold,
            medium_threshold=payload.medium_threshold,
        )
        db.add(threshold)
    else:
        threshold.high_threshold = payload.high_threshold
        threshold.medium_threshold = payload.medium_threshold

    db.commit()
    db.refresh(threshold)
    return threshold