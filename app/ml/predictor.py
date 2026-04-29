import pickle
from pathlib import Path
from functools import lru_cache

import pandas as pd
import numpy as np


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
    if not path.is_absolute():
        path = BASE_DIR / path
    if not path.exists():
        raise FileNotFoundError(f"Model file not found at {path}")
    with open(path, "rb") as f:
        return pickle.load(f)


def load_feature_columns_from_path(feature_columns_path: str):
    path = Path(feature_columns_path)
    if not path.is_absolute():
        path = BASE_DIR / path
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

    top_factors = _explain_top_factors(model=model, df=df, cache_key=_get_model_cache_key(model_path))

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


_EXPLAINER_CACHE: dict[str, object] = {}


def _get_model_cache_key(model_path: str | None) -> str:
    # Keyed by artifact path so we don't mix explainers across models.
    # If no model_path provided, fall back to the default MODEL_PATH.
    p = Path(model_path) if model_path else MODEL_PATH
    if not p.is_absolute():
        p = BASE_DIR / p
    return str(p.resolve())


def _explain_top_factors(model, df: pd.DataFrame, cache_key: str) -> str:
    """
    Compute per-row top factors.

    Preferred: SHAP TreeExplainer values (per-student local attribution).
    Fallback: global feature_importances_ weighted by |value| (less accurate).
    """
    # 1) Try SHAP (best)
    try:
        import shap  # heavy import; only used when needed

        # Cache the explainer by model artifact path to keep repeated calls fast.
        # (Bulk dataset regenerate can still be heavy if enabled; we generally avoid SHAP there.)
        explainer = _EXPLAINER_CACHE.get(cache_key)
        if explainer is None:
            explainer = shap.TreeExplainer(model)
            _EXPLAINER_CACHE[cache_key] = explainer

        exp = explainer(df)
        values = getattr(exp, "values", None)
        if values is None:
            raise RuntimeError("SHAP explanation missing values")

        # Binary classifiers sometimes return list-like shap arrays; handle both.
        if isinstance(values, list):
            # choose positive class if available, else first
            vals = np.asarray(values[1] if len(values) > 1 else values[0])
        else:
            vals = np.asarray(values)

        # Expected shape: (1, n_features)
        row_vals = vals[0]
        abs_vals = np.abs(row_vals)
        if not np.any(abs_vals):
            return "No non-zero SHAP contributions found"

        top_idx = np.argsort(abs_vals)[::-1][:5]
        row_values = df.iloc[0]

        parts: list[str] = []
        for i in top_idx:
            name = str(df.columns[int(i)])
            shap_val = float(abs_vals[int(i)])
            feat_val = float(row_values[name])
            if shap_val <= 0:
                continue
            # Keep frontend parsing stable: "importance=" is now |SHAP value|.
            parts.append(f"{name} (value={feat_val:.2f}, importance={shap_val:.4f})")

        return "; ".join(parts) if parts else "No non-zero SHAP contributions found"
    except Exception:
        pass

    # 2) Fallback: feature_importances_ (global) * |value|
    if hasattr(model, "feature_importances_"):
        try:
            importances = model.feature_importances_
            row_values = df.iloc[0]

            contribution_rows = []
            for col, imp in zip(df.columns, importances):
                value = float(row_values[col])
                contribution = float(imp) * abs(value)
                if contribution > 0:
                    contribution_rows.append((col, contribution, value, float(imp)))

            contribution_rows.sort(key=lambda x: x[1], reverse=True)
            top = contribution_rows[:5]

            if top:
                return "; ".join(
                    f"{name} (value={value:.2f}, importance={importance:.4f})"
                    for name, _, value, importance in top
                )
            return "No non-zero feature contributions found"
        except Exception:
            return "Feature importance computation failed"

    return "Feature importance unavailable"