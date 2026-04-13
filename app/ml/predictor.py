import os
import pickle
import pandas as pd
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
MODEL_DIR = BASE_DIR  / "model"

MODEL_PATH = MODEL_DIR / "final_xgb_model.pkl"
FEATURE_COLUMNS_PATH = MODEL_DIR / "final_feature_columns.pkl"


def load_model():
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    return model


def load_feature_columns():
    with open(FEATURE_COLUMNS_PATH, "rb") as f:
        feature_columns = pickle.load(f)
    return feature_columns


def get_risk_level(risk_score: float) -> str:
    if risk_score >= 0.7:
        return "High"
    elif risk_score >= 0.4:
        return "Medium"
    return "Low"


def build_feature_dataframe(feature_snapshot) -> pd.DataFrame:
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

    feature_columns = load_feature_columns()

    for col in feature_columns:
        if col not in df.columns:
            df[col] = 0

    df = df[feature_columns]

    return df


def generate_prediction(feature_snapshot):
    model = load_model()
    df = build_feature_dataframe(feature_snapshot)

    risk_score = float(model.predict_proba(df)[0][1])
    predicted_label = int(model.predict(df)[0])
    confidence_score = max(
        float(model.predict_proba(df)[0][0]),
        float(model.predict_proba(df)[0][1])
    )
    risk_level = get_risk_level(risk_score)

    top_factors = "Prediction generated from engagement and assessment features"

    return {
        "risk_score": risk_score,
        "predicted_label": predicted_label,
        "risk_level": risk_level,
        "confidence_score": confidence_score,
        "top_factors": top_factors,
    }