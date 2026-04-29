from pydantic import BaseModel


class FeatureAveragesResponse(BaseModel):
    dataset_id: int
    days_from_start: int
    n_snapshots: int
    averages: dict[str, float]

