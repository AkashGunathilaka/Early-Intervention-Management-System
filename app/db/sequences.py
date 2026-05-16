"""
Postgres sequence helpers.

These functions fix ID sequences after importing rows with existing IDs. This is useful when an import keeps original IDs
because postgres does not always move to the next id by itself
"""

from sqlalchemy import text
from sqlalchemy.orm import Session


TABLE_PK_COLUMNS: dict[str, str] = {
    "students": "student_id",
    "feature_snapshots": "feature_id",
    "predictions": "prediction_id",
    "interventions": "intervention_id",
    "datasets": "dataset_id",
    "model_records": "model_id",
    "users": "user_id",
    "risk_thresholds": "id",
}


def reset_sequence(db: Session, table: str, pk_column: str) -> int | None:
    """
    Reset the sequence behind `table.pk_column` so that the next value is
    MAX(pk_column) + 1. Returns the new sequence value, or None if the table
    has no rows / no associated sequence.
    """
    sql = text(
        f"""
        SELECT setval(
            pg_get_serial_sequence(:table, :col),
            COALESCE((SELECT MAX({pk_column}) FROM {table}), 1),
            (SELECT MAX({pk_column}) FROM {table}) IS NOT NULL
        )
        """
    )
    result = db.execute(sql, {"table": table, "col": pk_column}).scalar()
    return int(result) if result is not None else None


def reset_all_sequences(db: Session) -> dict[str, int | None]:
    """
    Re-sync sequences for every table in TABLE_PK_COLUMNS. Returns a dict
    mapping table name to the new sequence value.
    """
    results: dict[str, int | None] = {}
    for table, pk in TABLE_PK_COLUMNS.items():
        try:
            results[table] = reset_sequence(db, table, pk)
        except Exception as exc:  # noqa: BLE001 - we want to keep going on per-table errors
            results[table] = None
            print(f"[reset_all_sequences] skipped {table}: {exc}")
    db.commit()
    return results
