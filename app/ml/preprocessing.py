"""
Feature engineering for model training

.This file turns the raw oulad tables into a clean training dataset. It creates the target label, building early activity features, and prepares the data for XGBoost
"""

import pandas as pd


def prepare_training_dataframe_from_raw_tables(
    student_info: pd.DataFrame,
    student_vle: pd.DataFrame,
    student_assessment: pd.DataFrame,
    assessments: pd.DataFrame,
    early_days: int = 30,
    drop_code_module: bool = True,
) -> pd.DataFrame:
    """
    Only data from the first part of the course is used
    so the model is trained on information that would be available early enough for intervention
    """
    df_info = student_info.copy()
    #treat fail and withdrawn as the at-risk class
    df_info["at_risk"] = df_info["final_result"].apply(
        lambda x: 1 if x in ["Fail", "Withdrawn"] else 0
    )

    # keep only early VLE activity
    early_vle = student_vle[student_vle["date"] <= early_days]
    vle_features = (
        early_vle.groupby(["id_student", "code_module", "code_presentation"])
        .agg(
            total_clicks=("sum_click", "sum"),
            avg_clicks=("sum_click", "mean"),
            vle_records=("sum_click", "count"),
        )
        .reset_index()
    )

    # Join assessment so we can include scores and weights together
    assessment_full = student_assessment.merge(
        assessments,
        on="id_assessment",
        how="left",
    )

    # keep only assessments in the early window
    early_assessments = assessment_full[
        assessment_full["date_submitted"] <= early_days
    ]
    assessment_features = (
        early_assessments.groupby(["id_student", "code_module", "code_presentation"])
        .agg(
            avg_score=("score", "mean"),
            total_score=("score", "sum"),
            assessment_count=("score", "count"),
            avg_weight=("weight", "mean"),
        )
        .reset_index()
    )

    # Add assessment features to the same student rows
    df = df_info.merge(
        vle_features,
        on=["id_student", "code_module", "code_presentation"],
        how="left",
    )
    df = df.merge(
        assessment_features,
        on=["id_student", "code_module", "code_presentation"],
        how="left",
    )


    numeric_feature_cols = [
        "total_clicks",
        "avg_clicks",
        "vle_records",
        "avg_score",
        "total_score",
        "assessment_count",
        "avg_weight",
    ]
    # missing values here mean the student had no activity in the early window
    for col in numeric_feature_cols:
        if col not in df.columns:
            df[col] = 0
    df[numeric_feature_cols] = df[numeric_feature_cols].fillna(0)

    # keep missing values as their own category
    if "imd_band" in df.columns:
        df["imd_band"] = df["imd_band"].fillna("Unknown")

    # remove the original final result so it is not used as a feature
    if "final_result" in df.columns:
        df = df.drop(columns=["final_result"])

    # optionally remove the code module to reduce mosule-specific columns
    if drop_code_module and "code_module" in df.columns:
        df = df.drop(columns=["code_module"])

    return df


def encode_for_training(df: pd.DataFrame, target_column: str = "at_risk") -> tuple[pd.DataFrame, pd.Series, list[str]]:
    """
    Split features and target, then one-hot encode categorical columns.
    the returned feature column list is saved with the model so prediction data can be prepared in the same column order later
    """
    if target_column not in df.columns:
        raise ValueError(f"Missing target column: {target_column}")

    y = df[target_column].copy()
    x = df.drop(columns=[target_column]).copy()
    #do not let the model learn from the raw student ID
    if "id_student" in x.columns:
        x = x.drop(columns=["id_student"])

    #Convert categorical columns into numeric dummy columns
    x = pd.get_dummies(x, drop_first=True)

    #clean column names so they work safely with the model and shap
    x.columns = x.columns.str.replace(r"[\[\]<]", "", regex=True)

    feature_columns = x.columns.tolist()
    return x, y, feature_columns


def build_prediction_dataframe(student, feature_snapshot, feature_columns: list[str]) -> pd.DataFrame:
    """
    Build one model input row from a student profile + feature snapshot.

    Uses the same one-hot encoding as training (drop_first=True). Columns missing
    after encoding are filled with 0 so the row matches the saved feature list.
    """
    row = {
        "num_of_prev_attempts": int(student.num_of_prev_attempts or 0),
        "studied_credits": int(student.studied_credits or 0),
        "total_clicks": float(feature_snapshot.total_clicks or 0),
        "avg_clicks": float(feature_snapshot.avg_clicks or 0),
        "vle_records": int(feature_snapshot.vle_records or 0),
        "avg_score": float(feature_snapshot.avg_score or 0),
        "total_score": float(feature_snapshot.total_score or 0),
        "assessment_count": int(feature_snapshot.assessment_count or 0),
        "avg_weight": float(feature_snapshot.avg_weight or 0),
        "gender": str(student.gender or ""),
        "region": str(student.region or ""),
        "highest_education": str(student.highest_education or ""),
        "imd_band": str(student.imd_band or "Unknown"),
        "age_band": str(student.age_band or ""),
        "disability": str(student.disability or ""),
        "code_presentation": str(student.code_presentation or ""),
    }

    df = pd.DataFrame([row])
    x = pd.get_dummies(df, drop_first=True)
    x.columns = x.columns.str.replace(r"[\[\]<]", "", regex=True)

    for col in feature_columns:
        if col not in x.columns:
            x[col] = 0

    return x[feature_columns]


def average_profile_features(students) -> dict[str, float]:
    """
    Mean of numeric profile fields and one-hot columns across a group of students.

    Used for low-risk baseline comparisons in the UI (e.g. studied_credits, gender_M).
    """
    if not students:
        return {}

    rows = [
        {
            "num_of_prev_attempts": int(s.num_of_prev_attempts or 0),
            "studied_credits": int(s.studied_credits or 0),
            "gender": str(s.gender or ""),
            "region": str(s.region or ""),
            "highest_education": str(s.highest_education or ""),
            "imd_band": str(s.imd_band or "Unknown"),
            "age_band": str(s.age_band or ""),
            "disability": str(s.disability or ""),
            "code_presentation": str(s.code_presentation or ""),
        }
        for s in students
    ]

    df = pd.DataFrame(rows)
    x = pd.get_dummies(df, drop_first=True)
    x.columns = x.columns.str.replace(r"[\[\]<]", "", regex=True)
    return {str(col): float(x[col].mean()) for col in x.columns}