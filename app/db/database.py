from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

#loading the env variables from the env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

#create engine
engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

#base class for models
Base = declarative_base()

#Dependancy for getting DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
