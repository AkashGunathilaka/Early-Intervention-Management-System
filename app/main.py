from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import Base, engine
from app.api.routes.user import router as user_router
from app.api.routes.student import router as student_router
from app.api.routes.feature_snapshot import router as feature_snapshot_router
from app.api.routes.prediction import router as prediction_router
from app.api.routes.intervention import router as intervention_router
from app.api.routes import auth
from app.api.routes.model_management import router as model_management_router
from app.api.routes.risk_threshold import router as risk_threshold_router
from app.api.routes.ml_admin import router as ml_admin_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.data_admin import router as data_admin_router
from app.api.routes.dataset import router as dataset_router
# Import models so SQLAlchemy knows about them

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Early Intervention Management System")

# CORS for local frontend dev (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router)
app.include_router(student_router)
app.include_router(feature_snapshot_router)
app.include_router(prediction_router)
app.include_router(intervention_router)
app.include_router(risk_threshold_router)
app.include_router(auth.router)
app.include_router(model_management_router)
app.include_router(ml_admin_router)
app.include_router(dashboard_router)
app.include_router(data_admin_router)
app.include_router(dataset_router)


