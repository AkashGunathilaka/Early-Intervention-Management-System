"""
Imports all database models in one place


This makes sure SQLAlchemy knows about all the tables in the database
"""

from app.models.risk_threshold import RiskThreshold
from app.models.user import User
from app.models.dataset import Dataset
from app.models.student import Student
from app.models.feature_snapshot import FeatureSnapshot
from app.models.model_record import ModelRecord
from app.models.prediction import Prediction
from app.models.intervention import Intervention