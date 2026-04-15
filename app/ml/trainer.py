from pathlib import Path
import pickle

import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

MODEL_DIR = Path("model")
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def train_model_from_csv(csv_path: str,version: str, target_column: str = "at_risk_label") -> dict:
    artifact_dir = MODEL_DIR / "artifacts" / version
    artifact_dir.mkdir(parents=True, exist_ok=True)

    model_path = artifact_dir / "model.pkl"
    feature_columns_path = artifact_dir / "feature_columns.pkl"

    df = pd.read_csv(csv_path)

    if target_column not in df.columns:
        raise ValueError(f"Missing target column: {target_column}")

    y = df[target_column]
    X = df.drop(columns=[target_column])

    # Keep feature list for predictor alignment
    feature_columns = list(X.columns)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1_score": float(f1_score(y_test, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, y_prob)),
    }

    with open(model_path, "wb") as f:
        pickle.dump(model, f)

    with open(feature_columns_path, "wb") as f:
        pickle.dump(feature_columns, f)

    return {
    "accuracy": float(accuracy_score(y_test, y_pred)),
    "precision": float(precision_score(y_test, y_pred, zero_division=0)),
    "recall": float(recall_score(y_test, y_pred, zero_division=0)),
    "f1_score": float(f1_score(y_test, y_pred, zero_division=0)),
    "roc_auc": float(roc_auc_score(y_test, y_prob)),
    "model_path": str(model_path),
    "feature_columns_path": str(feature_columns_path),
    }   