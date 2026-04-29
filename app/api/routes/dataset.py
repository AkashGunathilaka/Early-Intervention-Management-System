from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_active_user, require_admin
from app.db.database import get_db
from app.models.dataset import Dataset
from app.models.user import User
from app.schemas.dataset import DatasetCreate, DatasetResponse

router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.get("/", response_model=list[DatasetResponse])
def list_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return db.query(Dataset).order_by(Dataset.dataset_id.asc()).all()


@router.post("/", response_model=DatasetResponse)
def create_dataset(
    payload: DatasetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    name = payload.dataset_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="dataset_name is required")

    ds = Dataset(
        dataset_name=name,
        source_type=payload.source_type.strip() or "manual",
        file_path=None,
        status="created",
        uploaded_by=current_user.user_id,
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return ds

