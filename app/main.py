from fastapi import FastAPI
from app.db.database import Base, engine
from app.api.user import router as user_router
from app.api.student import router as student_router
from app.api.feature_snapshot import router as feature_snapshot_router



from app.models import *

# Import models so SQLAlchemy knows about them
from app.models import User, Dataset, Student, FeatureSnapshot, ModelRecord, Prediction, Intervention

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Early Intervention Management System")

app.include_router(user_router)
app.include_router(student_router)
app.include_router(feature_snapshot_router)
