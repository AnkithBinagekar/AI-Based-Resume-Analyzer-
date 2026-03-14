import os
import shutil
import fitz # PyMuPDF
import zipfile
import uuid

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from groq import Groq

# Import local modules
from utils.security import detect_fraudulent_resume
from utils.anonymizer import scrub_pii
from utils.ml_engine import AIResumeAnalyzerEngine
from utils.database import engine, get_db
from utils import models

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Resume Analyzer API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Initializing AI Engine...")
ai_engine = AIResumeAnalyzerEngine()

@app.get("/")
def read_root():
    return {"message": "AI Resume Analyzer Backend is Running."}

def clean_jd_with_llm(raw_text):
    if not groq_client:
        return raw_text 
        
    try:
        prompt = f"""
        You are an expert technical recruiter. I am going to give you a raw Job Description that contains noise.
        Extract ONLY the core technical skills, soft skills, educational requirements, and key responsibilities.
        Return the cleaned Job Description as a clean, continuous paragraph without any formatting, bullet points, or introductory text. Just the pure requirements.
        
        Raw JD:
        {raw_text}
        """
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"JD Cleaning Error: {e}")
        return raw_text

@app.post("/analyze")
async def analyze_resume(
    resume_file: UploadFile = File(...), 
    job_description_text: str = Form(None),
    job_description_file: UploadFile = File(None),
    blind_mode: str = Form("false"),
    db: Session = Depends(get_db)
):
    if not job_description_text and not job_description_file:
        raise HTTPException(status_code=400, detail="Must provide either JD text or JD file.")

    if not resume_file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    raw_jd = ""
    if job_description_file:
        temp_jd_path = f"temp_jd_{uuid.uuid4().hex[:6]}.pdf"
        with open(temp_jd_path, "wb") as buffer:
            shutil.copyfileobj(job_description_file.file, buffer)
        try:
            doc = fitz.open(temp_jd_path)
            raw_jd = " ".join([page.get_text() for page in doc])
            doc.close()
        finally:
            os.remove(temp_jd_path)
    else:
        raw_jd = job_description_text

    cleaned_jd = clean_jd_with_llm(raw_jd)
    
    temp_pdf_path = f"temp_{uuid.uuid4().hex[:6]}_{resume_file.filename}"
    with open(temp_pdf_path, "wb") as buffer:
        shutil.copyfileobj(resume_file.file, buffer)

    try:
        security_report = detect_fraudulent_resume(temp_pdf_path)
        if security_report["is_fraud"]:
            raise HTTPException(
                status_code=406, 
                detail=f"🚨 FRAUD DETECTED: {security_report['hidden_words_count']} hidden/microscopic keywords found. Candidate auto-rejected for ATS manipulation."
            )
        
        resume_text = ""
        doc = fitz.open(temp_pdf_path)
        resume_text = " ".join([page.get_text() for page in doc])
        doc.close()
            
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from the PDF.")
            
        is_blind = str(blind_mode).lower() == 'true'
        final_filename = resume_file.filename
        
        if is_blind:
            resume_text = scrub_pii(resume_text)
            secure_id = uuid.uuid4().hex[:6].upper()
            final_filename = f"🔒 Anonymous_Candidate_{secure_id}.pdf"
            
        result = ai_engine.compute_hybrid_features(resume_text, cleaned_jd)

        jd_skills = result["skill_analysis"]["jd_skills_detected"]
        common_skills = result["skill_analysis"]["common_skills"]
        missing_skills = [skill for skill in jd_skills if skill not in common_skills]

        ai_feedback = "Candidate possesses all requested technical skills! Excellent match."
        if missing_skills and groq_client:
            try:
                prompt = f"""
                You are an expert Executive Career Coach and Recruiter. A candidate scored {result['final_match_score_percentage']}% and is missing these specific skills: {', '.join(missing_skills)}. 
                
                Provide a highly polished, professional "Recommended Learning Path". 
                Format your response strictly in Markdown. 
                For each recommended skill, you MUST provide a real clickable markdown hyperlink that searches for that topic. 
                
                Use these exact URL formats for the links, replacing the skill name:
                - [Find {missing_skills[0]} Courses on Udemy](https://www.udemy.com/courses/search/?q={missing_skills[0]})
                - [Watch {missing_skills[0]} Tutorials on YouTube](https://www.youtube.com/results?search_query={missing_skills[0]}+tutorial)
                
                Keep the tone encouraging, concise, and enterprise-ready. Use bullet points and bold text. Do not output raw URLs; only use clean Markdown links.
                """
                chat_completion = groq_client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model="llama-3.1-8b-instant",
                )
                ai_feedback = chat_completion.choices[0].message.content.strip()
            except Exception as e:
                print(f"LLM Coach Error: {e}")
                ai_feedback = "Focus on acquiring the missing skills listed above to improve your compatibility score."
        
        result["ai_feedback"] = ai_feedback
        result["processed_filename"] = final_filename
        result["cleaned_jd"] = cleaned_jd

        db_job = models.JobDescription(title="Uploaded Job Description", description_text=raw_jd) 
        db.add(db_job)
        db.commit()
        db.refresh(db_job) 

        db_candidate = models.Candidate(
            job_id=db_job.id,
            filename=final_filename,
            final_score=result["final_match_score_percentage"],
            skill_overlap_score=result["feature_breakdown"]["skill_overlap_score"],
            semantic_score=result["feature_breakdown"]["semantic_score"],
            lexical_score=result["feature_breakdown"]["lexical_score"],
            matched_skills=",".join(common_skills),
            missing_skills=",".join(missing_skills)
        )
        db.add(db_candidate)
        db.commit()

        return {"status": "success", "data": result}
        
    except Exception as e:
        raise HTTPException(status_code=500 if not isinstance(e, HTTPException) else e.status_code, detail=str(e))
    finally:
        if os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)

@app.post("/tailor")
async def tailor_resume(
    resume_file: UploadFile = File(...), 
    job_description: str = Form(...) 
):
    try:
        temp_pdf_path = f"temp_tailor_{uuid.uuid4().hex[:6]}.pdf"
        with open(temp_pdf_path, "wb") as buffer:
            shutil.copyfileobj(resume_file.file, buffer)
            
        doc = fitz.open(temp_pdf_path)
        resume_text = " ".join([page.get_text() for page in doc])
        doc.close()
        os.remove(temp_pdf_path)

        if not groq_client:
            raise HTTPException(status_code=500, detail="Groq API Key missing.")
            
        prompt = f"""
        You are an Expert Executive Resume Writer. 
            
        Here is the candidate's current resume text:
        {resume_text}
            
        Here is the target Job Description:
        {job_description}
            
        TASK:
        Rewrite the candidate's "Professional Experience" and "Projects" bullet points to perfectly align with the target Job Description. 
            
        STRICT RULES:
        1. DO NOT invent or fabricate any experience. Only use facts from their current resume.
        2. Change the phrasing and terminology to match the keywords used in the JD.
        3. Make the bullet points punchy, impact-driven, and ATS-friendly (use action verbs).
        4. Bold the specific keywords you aligned with the JD so the candidate sees the changes.
        5. Format the entire response beautifully in Markdown. Do not include introductory filler text, just give me the tailored resume sections.
        """
            
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
        )
        return {"status": "success", "tailored_resume": chat_completion.choices[0].message.content.strip()}

    except Exception as e:
        print(f"Tailoring Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate tailored resume.")

@app.post("/analyze-bulk")
async def analyze_bulk_resumes(
    resume_zip: UploadFile = File(...), 
    job_description_text: str = Form(None),
    job_description_file: UploadFile = File(None),
    blind_mode: str = Form("false"),
    db: Session = Depends(get_db)
):
    if not job_description_text and not job_description_file:
        raise HTTPException(status_code=400, detail="Must provide either JD text or JD file.")
        
    if not resume_zip.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only ZIP files are supported.")
    
    raw_jd = ""
    if job_description_file:
        temp_jd_path = f"temp_bulk_jd_{uuid.uuid4().hex[:6]}.pdf"
        with open(temp_jd_path, "wb") as buffer:
            shutil.copyfileobj(job_description_file.file, buffer)
        try:
            doc = fitz.open(temp_jd_path)
            raw_jd = " ".join([page.get_text() for page in doc])
            doc.close()
        finally:
            os.remove(temp_jd_path)
    else:
        raw_jd = job_description_text

    cleaned_jd = clean_jd_with_llm(raw_jd)

    db_job = models.JobDescription(title="Bulk Upload Batch", description_text=raw_jd)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    temp_zip_path = f"temp_{uuid.uuid4().hex[:6]}_{resume_zip.filename}"
    extract_folder = f"temp_extracted_{uuid.uuid4().hex[:6]}"

    with open(temp_zip_path, "wb") as buffer:
        shutil.copyfileobj(resume_zip.file, buffer)

    processed_candidates = []
    is_blind = str(blind_mode).lower() == 'true'

    try:
        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_folder)

        for filename in os.listdir(extract_folder):
            if filename.lower().endswith('.pdf'):
                file_path = os.path.join(extract_folder, filename)
                
                doc = fitz.open(file_path)
                resume_text = " ".join([page.get_text() for page in doc])
                doc.close()
                        
                if not resume_text.strip():
                    continue 
                    
                if is_blind:
                    resume_text = scrub_pii(resume_text)
                    secure_id = uuid.uuid4().hex[:6].upper()
                    final_filename = f"🔒 Anonymous_Candidate_{secure_id}.pdf"
                else:
                    final_filename = filename
                    
                result = ai_engine.compute_hybrid_features(resume_text, cleaned_jd)

                jd_skills = result["skill_analysis"]["jd_skills_detected"]
                common_skills = result["skill_analysis"]["common_skills"]
                missing_skills = [skill for skill in jd_skills if skill not in common_skills]

                db_candidate = models.Candidate(
                    job_id=db_job.id,
                    filename=final_filename,
                    final_score=result["final_match_score_percentage"],
                    skill_overlap_score=result["feature_breakdown"]["skill_overlap_score"],
                    semantic_score=result["feature_breakdown"]["semantic_score"],
                    lexical_score=result["feature_breakdown"]["lexical_score"],
                    matched_skills=",".join(common_skills),
                    missing_skills=",".join(missing_skills)
                )
                db.add(db_candidate)
                db.commit()

                processed_candidates.append({
                    "filename": final_filename, 
                    "score": result["final_match_score_percentage"]
                })

        leaderboard = sorted(processed_candidates, key=lambda x: x['score'], reverse=True)

        return {"status": "success", "processed_count": len(leaderboard), "data": leaderboard}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_zip_path):
            os.remove(temp_zip_path)
        if os.path.exists(extract_folder):
            shutil.rmtree(extract_folder)

@app.get("/api/candidates")
def get_all_candidates(db: Session = Depends(get_db)):
    candidates = db.query(models.Candidate).order_by(models.Candidate.id.desc()).all()
    return {"status": "success", "data": candidates}