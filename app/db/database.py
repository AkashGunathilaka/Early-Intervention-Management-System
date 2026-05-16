"""
Database setup

this file crates the SQLAlchemy engine, session factory and Base class which is used by the rest of the application
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Main database engine used by the app
engine = create_engine(DATABASE_URL)


#Creates database sessions for routes and services
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


#Base class used by all SQLAlchemy models
Base = declarative_base()


def get_db():
    """
    creates a database session for one request

    the route or service decides when to rollback or commit. This only makes sure the session is closed after the request finishes
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
