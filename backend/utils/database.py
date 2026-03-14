from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# This creates a local SQLite database file named 'ats_database.db' in your backend root
SQLALCHEMY_DATABASE_URL = "sqlite:///../ats_database.db"

# Create the engine with a special flag required for SQLite in FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# This is the base class that all our database tables will inherit from
Base = declarative_base()

# Dependency to get a database session for our FastAPI endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()