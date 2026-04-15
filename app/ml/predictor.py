import pickle
from pathlib import Path
from functools import lru_cache

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
MODEL_DIR = BASE_DIR / "model"

MODEL_PATH = MODEL_DIR / "final_xgb_model.pkl"
FEATURE_COLUMNS_PATH = MODEL_DIR / "final_feature_columns.pkl"


@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


@lru_cache(maxsize=1)
def load_feature_columns():
    if not FEATURE_COLUMNS_PATH.exists():
        raise FileNotFoundError(f"Feature columns file not found at {FEATURE_COLUMNS_PATH}")
    with open(FEATURE_COLUMNS_PATH, "rb") as f:
        return pickle.load(f)


def load_model_from_path(model_path: str):
    path = Path(model_path)
    if not path.exists():
        raise FileNotFoundError(f"Model file not found at {path}")
    with open(path, "rb") as f:
        return pickle.load(f)


def load_feature_columns_from_path(feature_columns_path: str):
    path = Path(feature_columns_path)
    if not path.exists():
        raise FileNotFoundError(f"Feature columns file not found at {path}")
    with open(path, "rb") as f:
        return pickle.load(f)


def get_risk_level(risk_score: float) -> str:
    if risk_score >= 0.7:
        return "High"
    if risk_score >= 0.4:
        return "Medium"
    return "Low"


def build_feature_dataframe(feature_snapshot, feature_columns) -> pd.DataFrame:
    data = {
        "total_clicks": feature_snapshot.total_clicks,
        "avg_clicks": feature_snapshot.avg_clicks,
        "vle_records": feature_snapshot.vle_records,
        "avg_score": feature_snapshot.avg_score,
        "total_score": feature_snapshot.total_score,
        "assessment_count": feature_snapshot.assessment_count,
        "avg_weight": feature_snapshot.avg_weight,
    }

    df = pd.DataFrame([data])

    for col in feature_columns:
        if col not in df.columns:
            df[col] = 0

    return df[feature_columns]


def generate_prediction(feature_snapshot, model_path: str | None = None, feature_columns_path: str | None = None):
    model = load_model_from_path(model_path) if model_path else load_model()
    feature_columns = (
        load_feature_columns_from_path(feature_columns_path)
        if feature_columns_path
        else load_feature_columns()
    )

    df = build_feature_dataframe(feature_snapshot, feature_columns)

    probs = model.predict_proba(df)[0]
    risk_score = float(probs[1])
    predicted_label = int(model.predict(df)[0])
    confidence_score = float(max(probs))
    risk_level = get_risk_level(risk_score)

    top_factors = "Prediction generated from engagement and assessment features"

    return {
        "risk_score": risk_score,
        "predicted_label": predicted_label,
        "risk_level": risk_level,
        "confidence_score": confidence_score,
        "top_factors": top_factors,
    }


def clear_model_cache() -> None:
    load_model.cache_clear()
    load_feature_columns.cache_clear()