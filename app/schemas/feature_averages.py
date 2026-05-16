"""
Feature average response schema 

used by the student profile page to compare student activity with average values
"""

from pydantic import BaseModel


class FeatureAveragesResponse(BaseModel):
    dataset_id: int
    days_from_start: int
    n_snapshots: int
    averages: dict[str, float]

