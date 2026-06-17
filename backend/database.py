import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("No database url provided")

_engine = None
_SessionLocal = None
Base = declarative_base()

def get_db():
    global _engine, _SessionLocal
    if _engine == None or _SessionLocal == None:
        _engine = create_engine(DATABASE_URL)
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
        
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()

