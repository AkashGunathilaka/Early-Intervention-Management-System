"""
Reset database id sequences after a bulk import

run this if new records fail with duplicate key errors after importing csv data

usage: python -m Scripts.reset_sequences
"""

from app.db.database import SessionLocal
from app.db.sequences import reset_all_sequences


def main() -> None:
    db = SessionLocal()
    try:
        results = reset_all_sequences(db)
    finally:
        db.close()

    print("Sequence reset results:")
    for table, value in results.items():
        if value is None:
            print(f"  {table:<20} (skipped or empty)")
        else:
            print(f"  {table:<20} -> next value > {value}")


if __name__ == "__main__":
    main()
