import os
import shutil
import fitz # PyMuPDF
import zipfile
import uuid
import warnings
import pytesseract
import json
import re
from PIL import Image

# Silence Scikit-Learn feature name warnings
warnings.filterwarnings("ignore", message="X does not have valid feature names")

import platform
if platform.system() == "Windows":
    pytesseract.tesseract_cmd = 'C:/Program Files/Tesseract-OCR/tesseract.exe'
# On Linux (the cloud), pytesseract automatically finds it, so we do nothing!

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

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

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
    if not groq_client: return raw_text 
    try:
        prompt = f"You are an expert technical recruiter. Extract ONLY the core technical skills, soft skills, educational requirements, and key responsibilities from this JD. Return as a clean, continuous paragraph. Raw JD: {raw_text}"
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}], model="llama-3.1-8b-instant",
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception: return raw_text

# --- BULLETPROOF YOE & Education Extractor ---
def extract_yoe_and_edu(resume_text):
    if not groq_client: return 0.0, "Unknown"
    try:
        prompt = f"""
        Extract the total years of professional experience and highest education degree from this resume.
        Return ONLY a valid JSON object with exactly two keys: "yoe" (a float number) and "education" (a short string like 'Bachelors in CS' or 'Masters').
        Do not include any other text, markdown, or explanations. Just the JSON object.
        If experience is missing, return 0.0. If education is missing, return "Unknown".
        
        Resume Text:
        {resume_text[:4000]}
        """
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}], 
            model="llama-3.1-8b-instant",
        )
        
        raw_response = chat_completion.choices[0].message.content.strip()
        json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        
        if json_match:
            data = json.loads(json_match.group(0))
            return float(data.get("yoe", 0.0)), str(data.get("education", "Unknown"))
        else:
            return 0.0, "Unknown"
    except Exception as e:
        print(f"Extraction Error: {e}")
        return 0.0, "Unknown"

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
    if not resume_file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for resumes.")

    raw_jd = ""
    if job_description_file:
        file_ext = job_description_file.filename.lower().split('.')[-1]
        temp_jd_path = f"temp_jd_{uuid.uuid4().hex[:6]}.{file_ext}"
        with open(temp_jd_path, "wb") as buffer: shutil.copyfileobj(job_description_file.file, buffer)
        try:
            if file_ext == 'pdf':
                doc = fitz.open(temp_jd_path)
                raw_jd = " ".join([page.get_text() for page in doc])
                doc.close()
            elif file_ext in ['png', 'jpg', 'jpeg']:
                img = Image.open(temp_jd_path)
                raw_jd = pytesseract.image_to_string(img)
            else: raise HTTPException(status_code=400, detail="Unsupported JD file type.")
        finally:
            if os.path.exists(temp_jd_path): os.remove(temp_jd_path)
    else:
        raw_jd = job_description_text

    cleaned_jd = clean_jd_with_llm(raw_jd)
    if not cleaned_jd or not cleaned_jd.strip(): raise HTTPException(status_code=400, detail="Could not extract valid text from JD.")

    temp_pdf_path = f"temp_{uuid.uuid4().hex[:6]}_{resume_file.filename}"
    with open(temp_pdf_path, "wb") as buffer: shutil.copyfileobj(resume_file.file, buffer)

    try:
        security_report = detect_fraudulent_resume(temp_pdf_path)
        if security_report["is_fraud"]: raise HTTPException(status_code=406, detail=f"🚨 FRAUD DETECTED: {security_report['hidden_words_count']} hidden keywords found.")
        
        doc = fitz.open(temp_pdf_path)
        resume_text = " ".join([page.get_text() for page in doc])
        doc.close()
        if not resume_text.strip(): raise HTTPException(status_code=400, detail="Could not extract text from the PDF.")
            
        is_blind = str(blind_mode).lower() == 'true'
        final_filename = resume_file.filename
        
        if is_blind:
            resume_text = scrub_pii(resume_text)
            secure_id = uuid.uuid4().hex[:6].upper()
            final_filename = f"🔒 Anonymous_Candidate_{secure_id}.pdf"
            
        result = ai_engine.compute_hybrid_features(resume_text, cleaned_jd)
        yoe, education = extract_yoe_and_edu(resume_text)

        jd_skills = result["skill_analysis"]["jd_skills_detected"]
        if not jd_skills:
             result["final_match_score_percentage"] = 0.0
             result["feature_breakdown"]["skill_overlap_score"] = 0.0
             
        common_skills = result["skill_analysis"]["common_skills"]
        missing_skills = [skill for skill in jd_skills if skill not in common_skills]

        ai_feedback = "Candidate possesses all requested technical skills! Excellent match."
        if missing_skills and groq_client:
            try:
                prompt = f"""
                You are an expert Career Coach. A candidate scored {result['final_match_score_percentage']}% and is missing these skills: {', '.join(missing_skills)}. 
                Provide a short, professional learning path in Markdown. 
                For each recommended skill, you MUST provide a real clickable markdown hyperlink. 
                Use these exact URL formats:
                - [Find {missing_skills[0]} Courses on Udemy](https://www.udemy.com/courses/search/?q={missing_skills[0]})
                - [Watch {missing_skills[0]} Tutorials on YouTube](https://www.youtube.com/results?search_query={missing_skills[0]}+tutorial)
                Keep the tone encouraging.
                """
                chat_completion = groq_client.chat.completions.create(messages=[{"role": "user", "content": prompt}], model="llama-3.1-8b-instant")
                ai_feedback = chat_completion.choices[0].message.content.strip()
            except Exception: pass
        
        result["ai_feedback"] = ai_feedback
        result["processed_filename"] = final_filename
        result["cleaned_jd"] = cleaned_jd
        result["yoe"] = yoe
        result["education"] = education

        db_candidate = models.Candidate(
            job_id=1, 
            filename=final_filename,
            final_score=result["final_match_score_percentage"],
            skill_overlap_score=result["feature_breakdown"]["skill_overlap_score"],
            semantic_score=result["feature_breakdown"]["semantic_score"],
            lexical_score=result["feature_breakdown"]["lexical_score"],
            matched_skills=",".join(common_skills),
            missing_skills=",".join(missing_skills),
            total_yoe=yoe,
            highest_education=education
        )
        db.add(db_candidate)
        db.commit()

        return {"status": "success", "data": result}
        
    except Exception as e:
        raise HTTPException(status_code=500 if not isinstance(e, HTTPException) else e.status_code, detail=str(e))
    finally:
        if os.path.exists(temp_pdf_path): os.remove(temp_pdf_path)

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
        raise HTTPException(status_code=500, detail="Failed to generate tailored resume.")
    
@app.post("/generate-cover-letter")
async def generate_cover_letter(
    resume_file: UploadFile = File(...), 
    job_description: str = Form(...) 
):
    try:
        temp_pdf_path = f"temp_cl_{uuid.uuid4().hex[:6]}.pdf"
        with open(temp_pdf_path, "wb") as buffer:
            shutil.copyfileobj(resume_file.file, buffer)
            
        doc = fitz.open(temp_pdf_path)
        resume_text = " ".join([page.get_text() for page in doc])
        doc.close()
        os.remove(temp_pdf_path)

        if not groq_client:
            raise HTTPException(status_code=500, detail="Groq API Key missing.")
            
        prompt = f"""
        You are an expert Executive Career Coach and Copywriter. 
            
        Here is the candidate's current resume text:
        {resume_text}
            
        Here is the target Job Description:
        {job_description}
            
        TASK:
        Write a highly professional, compelling 3-paragraph cover letter for this candidate applying to this specific job.
            
        STRICT RULES:
        1. DO NOT invent or fabricate any experience. Only use facts from their resume.
        2. Paragraph 1: Strong opening, state the role, and a high-level summary of why they fit.
        3. Paragraph 2: Highlight 2-3 specific technical skills or projects from their resume that perfectly match the Job Description.
        4. Paragraph 3: Professional closing and call to action.
        5. Format the response beautifully in Markdown. Do not include any introductory filler text like "Here is your cover letter", just output the letter itself.
        """
            
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
        )
        return {"status": "success", "cover_letter": chat_completion.choices[0].message.content.strip()}

    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to generate cover letter.")

@app.post("/chat-resume")
async def chat_with_resume(
    resume_file: UploadFile = File(...), 
    question: str = Form(...) 
):
    try:
        temp_pdf_path = f"temp_chat_{uuid.uuid4().hex[:6]}.pdf"
        with open(temp_pdf_path, "wb") as buffer:
            shutil.copyfileobj(resume_file.file, buffer)
            
        doc = fitz.open(temp_pdf_path)
        resume_text = " ".join([page.get_text() for page in doc])
        doc.close()
        os.remove(temp_pdf_path)

        if not groq_client:
            raise HTTPException(status_code=500, detail="Groq API Key missing.")
            
        prompt = f"""
        You are an AI Recruiter Assistant. I am giving you a candidate's resume.
        You must answer the user's question based STRICTLY on the text in the resume. 
        If the answer is not in the resume, explicitly say "I cannot find this information in the candidate's resume."
        Do not make up any information. Be concise and professional.
            
        Resume Text:
        {resume_text}
            
        Recruiter's Question:
        {question}
        """
            
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
        )
        return {"status": "success", "answer": chat_completion.choices[0].message.content.strip()}

    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process chat.")

@app.post("/analyze-bulk")
async def analyze_bulk_resumes(
    resume_zip: UploadFile = File(...), 
    job_description_text: str = Form(None),
    job_description_file: UploadFile = File(None),
    blind_mode: str = Form("false"),
    db: Session = Depends(get_db)
):
    if not job_description_text and not job_description_file: raise HTTPException(status_code=400, detail="Missing JD.")
    if not resume_zip.filename.lower().endswith('.zip'): raise HTTPException(status_code=400, detail="Only ZIP files supported.")
    
    raw_jd = ""
    if job_description_file:
        file_ext = job_description_file.filename.lower().split('.')[-1]
        temp_jd_path = f"temp_bulk_jd_{uuid.uuid4().hex[:6]}.{file_ext}"
        with open(temp_jd_path, "wb") as buffer: shutil.copyfileobj(job_description_file.file, buffer)
        try:
            if file_ext == 'pdf':
                doc = fitz.open(temp_jd_path)
                raw_jd = " ".join([page.get_text() for page in doc])
                doc.close()
            elif file_ext in ['png', 'jpg', 'jpeg']:
                img = Image.open(temp_jd_path)
                raw_jd = pytesseract.image_to_string(img)
            else: raise HTTPException(status_code=400, detail="Unsupported type.")
        finally:
            if os.path.exists(temp_jd_path): os.remove(temp_jd_path)
    else: raw_jd = job_description_text

    cleaned_jd = clean_jd_with_llm(raw_jd)
    if not cleaned_jd or not cleaned_jd.strip(): raise HTTPException(status_code=400, detail="Invalid JD.")

    temp_zip_path = f"temp_{uuid.uuid4().hex[:6]}_{resume_zip.filename}"
    extract_folder = f"temp_extracted_{uuid.uuid4().hex[:6]}"
    with open(temp_zip_path, "wb") as buffer: shutil.copyfileobj(resume_zip.file, buffer)

    processed_candidates = []
    is_blind = str(blind_mode).lower() == 'true'

    try:
        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref: zip_ref.extractall(extract_folder)
        for filename in os.listdir(extract_folder):
            if filename.lower().endswith('.pdf'):
                file_path = os.path.join(extract_folder, filename)
                doc = fitz.open(file_path)
                resume_text = " ".join([page.get_text() for page in doc])
                doc.close()
                if not resume_text.strip(): continue 
                    
                if is_blind:
                    resume_text = scrub_pii(resume_text)
                    secure_id = uuid.uuid4().hex[:6].upper()
                    final_filename = f"🔒 Anonymous_Candidate_{secure_id}.pdf"
                else: final_filename = filename
                    
                result = ai_engine.compute_hybrid_features(resume_text, cleaned_jd)
                yoe, education = extract_yoe_and_edu(resume_text)

                jd_skills = result["skill_analysis"]["jd_skills_detected"]
                if not jd_skills:
                     result["final_match_score_percentage"] = 0.0
                     result["feature_breakdown"]["skill_overlap_score"] = 0.0

                common_skills = result["skill_analysis"]["common_skills"]
                missing_skills = [skill for skill in jd_skills if skill not in common_skills]

                db_candidate = models.Candidate(
                    job_id=1,
                    filename=final_filename,
                    final_score=result["final_match_score_percentage"],
                    skill_overlap_score=result["feature_breakdown"]["skill_overlap_score"],
                    semantic_score=result["feature_breakdown"]["semantic_score"],
                    lexical_score=result["feature_breakdown"]["lexical_score"],
                    matched_skills=",".join(common_skills),
                    missing_skills=",".join(missing_skills),
                    total_yoe=yoe,
                    highest_education=education
                )
                db.add(db_candidate)
                db.commit()
                processed_candidates.append({"filename": final_filename, "score": result["final_match_score_percentage"]})

        leaderboard = sorted(processed_candidates, key=lambda x: x['score'], reverse=True)
        return {"status": "success", "processed_count": len(leaderboard), "data": leaderboard}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_zip_path): os.remove(temp_zip_path)
        if os.path.exists(extract_folder): shutil.rmtree(extract_folder)

@app.get("/api/candidates")
def get_all_candidates(db: Session = Depends(get_db)):
    candidates = db.query(models.Candidate).order_by(models.Candidate.id.desc()).all()
    return {"status": "success", "data": candidates}

@app.get("/api/jobs")
def get_all_jobs(db: Session = Depends(get_db)):
    jobs = db.query(models.JobDescription).filter(
        models.JobDescription.title != "Uploaded Job Description",
        models.JobDescription.title != "Bulk Upload Batch"
    ).order_by(models.JobDescription.id.desc()).all()
    return {"status": "success", "data": jobs}

@app.post("/api/jobs")
async def create_new_job(
    title: str = Form(...),
    department: str = Form("General"),
    job_description_text: str = Form(None),
    job_description_file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    if not job_description_text and not job_description_file: raise HTTPException(status_code=400, detail="Missing JD input.")
    raw_jd = ""
    if job_description_file:
        file_ext = job_description_file.filename.lower().split('.')[-1]
        temp_jd_path = f"temp_db_jd_{uuid.uuid4().hex[:6]}.{file_ext}"
        with open(temp_jd_path, "wb") as buffer: shutil.copyfileobj(job_description_file.file, buffer)
        try:
            if file_ext == 'pdf':
                doc = fitz.open(temp_jd_path)
                raw_jd = " ".join([page.get_text() for page in doc])
                doc.close()
            elif file_ext in ['png', 'jpg', 'jpeg']:
                img = Image.open(temp_jd_path)
                raw_jd = pytesseract.image_to_string(img)
            else: raise HTTPException(status_code=400, detail="Unsupported JD file.")
        finally:
            if os.path.exists(temp_jd_path): os.remove(temp_jd_path)
    else: raw_jd = job_description_text

    if not raw_jd or not raw_jd.strip(): raise HTTPException(status_code=400, detail="Empty text.")

    full_title = f"{title} ({department})"
    db_job = models.JobDescription(title=full_title, description_text=raw_jd)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return {"status": "success", "data": {"id": db_job.id, "title": db_job.title}}