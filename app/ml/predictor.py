
#Prediction helper functions


import pickle
from pathlib import Path
from functools import lru_cache

import numpy as np
import pandas as pd

from app.ml.preprocessing import build_prediction_dataframe


BASE_DIR = Path(__file__).resolve().parents[2]
MODEL_DIR = BASE_DIR / "model"

MODEL_PATH = MODEL_DIR / "final_master_model.pkl"
FEATURE_COLUMNS_PATH = MODEL_DIR / "final_master_feature_columns.pkl"


@lru_cache(maxsize=1)
def load_model():
    #load the defauly model from disk , the result is cached to prevent reloads
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


@lru_cache(maxsize=1)
def load_feature_columns():
    #Load the feature column order , the column order must match the order used during training
    if not FEATURE_COLUMNS_PATH.exists():
        raise FileNotFoundError(f"Feature columns file not found at {FEATURE_COLUMNS_PATH}")
    with open(FEATURE_COLUMNS_PATH, "rb") as f:
        return pickle.load(f)


def load_model_from_path(model_path: str):
    #load a model from a given file path
    path = Path(model_path)
    if not path.is_absolute():
        path = BASE_DIR / path
    if not path.exists():
        raise FileNotFoundError(f"Model file not found at {path}")
    with open(path, "rb") as f:
        return pickle.load(f)


def load_feature_columns_from_path(feature_columns_path: str):
    # load the feature columns for a specific model
    path = Path(feature_columns_path)
    if not path.is_absolute():
        path = BASE_DIR / path
    if not path.exists():
        raise FileNotFoundError(f"Feature columns file not found at {path}")
    with open(path, "rb") as f:
        return pickle.load(f)


def generate_prediction(
    feature_snapshot,
    student,
    model_path: str | None = None,
    feature_columns_path: str | None = None,
):
    # run a prediction for one feature snapshot
    model = load_model_from_path(model_path) if model_path else load_model()
    feature_columns = (
        load_feature_columns_from_path(feature_columns_path)
        if feature_columns_path
        else load_feature_columns()
    )

    df = build_prediction_dataframe(student, feature_snapshot, feature_columns)

    # for this binary model, class 1 is treated as the at-risk class
    probs = model.predict_proba(df)[0]
    risk_score = float(probs[1])
    predicted_label = int(model.predict(df)[0])
    confidence_score = float(max(probs))

    top_factors = _explain_top_factors(model=model, df=df, cache_key=_get_model_cache_key(model_path))

    return {
        "risk_score": risk_score,
        "predicted_label": predicted_label,
        "confidence_score": confidence_score,
        "top_factors": top_factors,
    }




def clear_model_cache() -> None:
    # clear the cached model and feature columns
    load_model.cache_clear()
    load_feature_columns.cache_clear()


_EXPLAINER_CACHE: dict[str, object] = {}


def _get_model_cache_key(model_path: str | None) -> str:
    # build a cache key for the model being explained
    p = Path(model_path) if model_path else MODEL_PATH
    if not p.is_absolute():
        p = BASE_DIR / p
    return str(p.resolve())


def _explain_top_factors(model, df: pd.DataFrame, cache_key: str) -> str:
    # create a short explanation of the strongest features for this prediction
    #SHAP is used when available, if not , the function falls back to the models feature importance values
    try:
        import shap  # heavy import; only used when needed

        #Reusse the SHAP explainer for the same model instead of rebuilding it each time
        explainer = _EXPLAINER_CACHE.get(cache_key)
        if explainer is None:
            explainer = shap.TreeExplainer(model)
            _EXPLAINER_CACHE[cache_key] = explainer

        exp = explainer(df)
        values = getattr(exp, "values", None)
        if values is None:
            raise RuntimeError("SHAP explanation missing values")

        # Different SHAP versions retruns slightly different shapes, so normalize them
        if isinstance(values, list):
            vals = np.asarray(values[1] if len(values) > 1 else values[0])
        else:
            vals = np.asarray(values)

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
            parts.append(f"{name} (value={feat_val:.2f}, importance={shap_val:.4f})")

        return "; ".join(parts) if parts else "No non-zero SHAP contributions found"
    except Exception:
        # if SHAP fails, still return a simpler explanation instead of failing
        pass


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