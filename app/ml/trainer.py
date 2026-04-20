from pathlib import Path
import pickle
import json

import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from app.ml.preprocessing import (
    prepare_training_dataframe_from_raw_tables,
    encode_for_training,
)

MODEL_DIR = Path("model")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

def _write_metrics_json(artifact_dir: Path, payload: dict) -> str:
    metrics_path = artifact_dir / "metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, sort_keys=True)
    return str(metrics_path)

def validate_required_columns(df: pd.DataFrame, required_columns: list[str], dataset_name: str) -> None:
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise ValueError(f"{dataset_name} is missing required columns: {missing}")


def train_model_from_csv(csv_path: str, version: str, target_column: str = "at_risk_label") -> dict:
    artifact_dir = MODEL_DIR / "artifacts" / version
    artifact_dir.mkdir(parents=True, exist_ok=True)

    model_path = artifact_dir / "model.pkl"
    feature_columns_path = artifact_dir / "feature_columns.pkl"

    df = pd.read_csv(csv_path)

    required_columns = [
        target_column,
        "total_clicks",
        "avg_clicks",
        "vle_records",
        "avg_score",
        "assessment_count",
        "avg_weight",
        "total_score",
    ]
    validate_required_columns(df, required_columns, "Retrain CSV Dataset")

    y = df[target_column]
    X = df.drop(columns=[target_column])

    # Match notebook preprocessing behavior
    if "id_student" in X.columns:
        X = X.drop(columns=["id_student"])

    X = pd.get_dummies(X, drop_first=True)
    X.columns = X.columns.str.replace(r"[\[\]<]", "", regex=True)

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

    metrics_path = _write_metrics_json(
        artifact_dir,
        {
            "type": "csv_retrain",
            "source_csv": str(csv_path),
            "target_column": target_column,
            "split": {"method": "train_test_split", "test_size": 0.2, "random_state": 42, "stratify": True},
            "training_rows": int(len(df)),
            "feature_count": int(len(feature_columns)),
            **metrics,
        },
    )

    return {
        **metrics,
        "model_path": str(model_path),
        "feature_columns_path": str(feature_columns_path),
        "metrics_path": metrics_path,
    }


def train_model_from_oulad_tables(
    student_info_path: str,
    student_vle_path: str,
    student_assessment_path: str,
    assessments_path: str,
    version: str,
    early_days: int = 30,
    drop_code_module: bool = True,
) -> dict:
    artifact_dir = MODEL_DIR / "artifacts" / version
    artifact_dir.mkdir(parents=True, exist_ok=True)

    model_path = artifact_dir / "model.pkl"
    feature_columns_path = artifact_dir / "feature_columns.pkl"

    student_info = pd.read_csv(student_info_path)
    student_vle = pd.read_csv(student_vle_path)
    student_assessment = pd.read_csv(student_assessment_path)
    assessments = pd.read_csv(assessments_path)

    # Validate inputs BEFORE preprocessing
    validate_required_columns(
        student_info,
        ["id_student", "code_module", "code_presentation", "final_result", "imd_band"],
        "studentInfo",
    )

    validate_required_columns(
        student_vle,
        ["id_student", "code_module", "code_presentation", "date", "sum_click"],
        "studentVle",
    )

    validate_required_columns(
        student_assessment,
        ["id_student", "id_assessment", "date_submitted", "score"],
        "studentAssessment",
    )

    validate_required_columns(
        assessments,
        ["id_assessment", "code_module", "code_presentation", "weight"],
        "assessments",
    )

    df = prepare_training_dataframe_from_raw_tables(
        student_info=student_info,
        student_vle=student_vle,
        student_assessment=student_assessment,
        assessments=assessments,
        early_days=early_days,
        drop_code_module=drop_code_module,
    )

    X, y, feature_columns = encode_for_training(df, target_column="at_risk")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
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

    metrics_path = _write_metrics_json(
        artifact_dir,
        {
            "type": "oulad_retrain",
            "source_files": {
                "student_info_path": str(student_info_path),
                "student_vle_path": str(student_vle_path),
                "student_assessment_path": str(student_assessment_path),
                "assessments_path": str(assessments_path),
            },
            "early_days": early_days,
            "drop_code_module": drop_code_module,
            "split": {"method": "train_test_split", "test_size": 0.2, "random_state": 42, "stratify": True},
            "training_rows": int(len(df)),
            "feature_count": int(len(feature_columns)),
            **metrics,
        },
    )

    return {
        **metrics,
        "model_path": str(model_path),
        "feature_columns_path": str(feature_columns_path),
        "training_rows": int(len(df)),
        "feature_count": int(len(feature_columns)),
        "metrics_path": metrics_path,
    }