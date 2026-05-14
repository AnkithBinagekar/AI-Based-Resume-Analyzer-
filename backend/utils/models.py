from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func  # <-- DON'T FORGET THIS LINE!
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
    
    # Store skills as comma-separated strings for simplicity
    matched_skills = Column(String)
    missing_skills = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Link back to the Job Description
    job = relationship("JobDescription", back_populates="candidates")
    # Add these two lines inside your Candidate class:
    total_yoe = Column(Float, default=0.0)
    highest_education = Column(String, default="Unknown")

    # Add this to the bottom of backend/utils/models.py

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    # We add a role just in case you want to separate 'admin' and 'recruiter' later
    role = Column(String, default="recruiter") 
    created_at = Column(DateTime(timezone=True), server_default=func.now())