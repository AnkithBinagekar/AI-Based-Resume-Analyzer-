from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean # <-- Added Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from .database import Base

class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, default="Untitled Job")
    description_text = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    # A Job can have many candidates
    candidates = relationship("Candidate", back_populates="job")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_descriptions.id"))
    filename = Column(String)
    
    # The Scores
    final_score = Column(Float)
    skill_overlap_score = Column(Float)
    semantic_score = Column(Float)
    lexical_score = Column(Float)
    
    matched_skills = Column(String)
    missing_skills = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("JobDescription", back_populates="candidates")
    
    total_yoe = Column(Float, default=0.0)
    highest_education = Column(String, default="Unknown")

    # --- ADD THESE 3 NEW COLUMNS ---
    pipeline_status = Column(String, nullable=True)
    is_human_overridden = Column(Boolean, default=False)
    recruiter_notes = Column(String, nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="recruiter") 
    created_at = Column(DateTime(timezone=True), server_default=func.now())