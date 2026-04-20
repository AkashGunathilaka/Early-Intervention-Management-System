import pandas as pd


def prepare_training_dataframe_from_raw_tables(
    student_info: pd.DataFrame,
    student_vle: pd.DataFrame,
    student_assessment: pd.DataFrame,
    assessments: pd.DataFrame,
    early_days: int = 30,
    drop_code_module: bool = True,
) -> pd.DataFrame:
    # Target from notebook logic
    df_info = student_info.copy()
    df_info["at_risk"] = df_info["final_result"].apply(
        lambda x: 1 if x in ["Fail", "Withdrawn"] else 0
    )

    # Early-window VLE features
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

    # Early-window assessment features
    assessment_full = student_assessment.merge(
        assessments,
        on="id_assessment",
        how="left",
    )
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

    # Merge engineered features
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

    # Missing value handling 
    numeric_feature_cols = [
        "total_clicks",
        "avg_clicks",
        "vle_records",
        "avg_score",
        "total_score",
        "assessment_count",
        "avg_weight",
    ]
    for col in numeric_feature_cols:
        if col not in df.columns:
            df[col] = 0
    df[numeric_feature_cols] = df[numeric_feature_cols].fillna(0)

    if "imd_band" in df.columns:
        df["imd_band"] = df["imd_band"].fillna("Unknown")

    # Avoid leakage
    if "final_result" in df.columns:
        df = df.drop(columns=["final_result"])

    # Match notebook
    if drop_code_module and "code_module" in df.columns:
        df = df.drop(columns=["code_module"])

    return df


def encode_for_training(df: pd.DataFrame, target_column: str = "at_risk") -> tuple[pd.DataFrame, pd.Series, list[str]]:
    if target_column not in df.columns:
        raise ValueError(f"Missing target column: {target_column}")

    y = df[target_column].copy()
    x = df.drop(columns=[target_column]).copy()

    if "id_student" in x.columns:
        x = x.drop(columns=["id_student"])

    x = pd.get_dummies(x, drop_first=True)
    x.columns = x.columns.str.replace(r"[\[\]<]", "", regex=True)

    feature_columns = x.columns.tolist()
    return x, y, feature_columns