import os
import shutil
import fitz # PyMuPDF
import zipfile
import uuid
import warnings
import pytesseract
import json
import re
import math
import difflib
import base64
from typing import List
from PIL import Image

# Silence Scikit-Learn feature name warnings
warnings.filterwarnings("ignore", message="X does not have valid feature names")

import platform
if platform.system() == "Windows":
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from groq import Groq

# --- SECURITY IMPORTS ---
from pydantic import BaseModel
class StatusUpdateRequest(BaseModel):
    status: str

class NoteUpdateRequest(BaseModel):
    notes: str

from fastapi.security import OAuth2PasswordRequestForm
from utils.auth import get_password_hash, verify_password, create_access_token

# --- LOCAL MODULES ---
from utils.security import detect_fraudulent_resume
from utils.anonymizer import scrub_pii
from utils.ml_engine import AIResumeAnalyzerEngine
from utils.database import engine, get_db
from utils import models
from rag_engine import ingest_resume_to_vector_db, retrieve_relevant_chunks

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

class UserCreate(BaseModel):
    email: str
    password: str

@app.get("/")
def read_root():
    return {"message": "AI Resume Analyzer Backend is Running."}

# ==========================================
# HELPER FUNCTIONS
# ==========================================

def clean_jd_with_llm(raw_text):
    if not groq_client: return raw_text 
    try:
        prompt = f"""
        Fix any typos, OCR errors, or broken formatting in the text below. 
        CRITICAL RULES:
        1. DO NOT summarize, paraphrase, or change the meaning.
        2. DO NOT add, infer, or remove any keywords, sentences, or requirements.
        3. Return the exact original text with corrected spelling and structural layout only.
        
        Raw JD: 
        {raw_text}
        """
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a strict text formatter. You never summarize or alter meaning."},
                {"role": "user", "content": prompt}
            ], 
            model="llama-3.1-8b-instant",
            temperature=0.0 # Force deterministic output
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception: return raw_text

def strip_markdown_for_analysis(text: str) -> str:
    """Removes Markdown formatting to ensure TF-IDF and SBERT calculations are fair."""
    text = re.sub(r'#+\s*', '', text) 
    text = re.sub(r'[*_`~-]', '', text) 
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text) 
    text = re.sub(r'\s+', ' ', text) 
    return text.strip()

def detect_hallucinated_skills(orig_skills: set, new_skills: set, cutoff: float = 0.75) -> List[str]:
    """Deterministically compares new skills against original skills using fuzzy matching and synonym mapping."""
    synonyms = {
        "aws": "amazon web services",
        "js": "javascript",
        "ml": "machine learning",
        "ai": "artificial intelligence",
        "react": "react.js",
        "node": "node.js"
    }
    
    hallucinated = []
    orig_list = list(orig_skills)
    
    # Expand match surface by dynamically mapping known synonyms
    normalized_orig = [synonyms.get(sk.lower(), sk.lower()) for sk in orig_list] + [sk.lower() for sk in orig_list]
    
    for new_sk in new_skills:
        normalized_new = synonyms.get(new_sk.lower(), new_sk.lower())
        matches = difflib.get_close_matches(normalized_new, normalized_orig, n=1, cutoff=cutoff)
        if not matches:
            hallucinated.append(new_sk)
    return hallucinated

def calibrate_hybrid_score(raw_score: float, pool_scores: list) -> float:
    """Blends an absolute curve with a pool-based Z-score to normalize ATS scores."""
    absolute_curved = math.sqrt(raw_score / 100.0) * 100.0
    if len(pool_scores) < 3:
        return round(min(100.0, absolute_curved), 1)
        
    mean = sum(pool_scores) / len(pool_scores)
    variance = sum([((x - mean) ** 2) for x in pool_scores]) / len(pool_scores)
    std_dev = math.sqrt(variance) if variance > 0 else 1.0
    
    z_score = (raw_score - mean) / (std_dev + 1e-5)
    relative_score = 100.0 / (1.0 + math.exp(-1.2 * (z_score - 0.5)))
    
    final_calibrated = (0.60 * absolute_curved) + (0.40 * relative_score)
    print(f"""
===== SCORE DEBUG =====
Raw ML Score: {raw_score:.4f}
Pool Size: {len(pool_scores)}
Pool Mean: {mean:.4f}
Pool StdDev: {std_dev:.4f}
Z Score: {z_score:.4f}
Final Score: {final_calibrated:.4f}
=======================
""")
    return round(min(100.0, max(0.0, final_calibrated)), 1)

def extract_text_from_image(image_path, file_ext):
    img = Image.open(image_path)
    dirty_text = pytesseract.image_to_string(img)
    if groq_client:
        try:
            prompt = f"""
            You are an expert OCR correction AI. Fix all typos, restore formatting, and return perfectly clean readable text.
            DIRTY OCR TEXT:
            {dirty_text}
            """
            chat_completion = groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You only output the cleaned text. Nothing else."},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.1-8b-instant",
                temperature=0.1,
                max_tokens=2000
            )
            return chat_completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"⚠️ Groq OCR Cleanup failed: {e}")
    return dirty_text

def extract_yoe_and_edu(resume_text):
    """Bulletproof YOE & Education Extractor utilizing the proven Llama-3.1 regex approach."""
    if not groq_client: return 0.0, "Unknown"
    try:
        from datetime import datetime
        current_date = datetime.now().strftime("%B %Y")

        prompt = f"""
        Extract the total years of professional experience and highest education degree from this resume.
        
        CRITICAL RULES FOR EXPERIENCE (YOE):
        1. ONLY count actual employment, jobs, or official internships.
        2. DO NOT count academic degrees, university projects, personal projects, or certifications.
        3. Today's date is {current_date}. If a role says "Present" or "Current", calculate the duration up to {current_date}.
        4. Mentally calculate the months for each valid role, sum them up, and divide by 12 to get the years.
        
        Return ONLY a valid JSON object with exactly two keys: "yoe" (a float number) and "education" (a short string like 'Bachelors in CS').
        Do not include any other text, markdown, or explanations. Just the JSON object.
        
        Resume Text:
        {resume_text[:4000]}
        """
        
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}], 
            model="llama-3.1-8b-instant",
            temperature=0.0
        )
        
        raw_response = chat_completion.choices[0].message.content.strip()
        json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        
        if json_match:
            data = json.loads(json_match.group(0))
            
            # Robust float parsing (Handles hallucinated strings like "2.5 years")
            yoe_raw = data.get("yoe", 0.0)
            if isinstance(yoe_raw, str):
                nums = re.search(r'\d+(\.\d+)?', yoe_raw)
                yoe_val = float(nums.group(0)) if nums else 0.0
            else:
                yoe_val = float(yoe_raw)
                
            clean_yoe = round(yoe_val, 1) 
            
            # Robust education string check
            education_str = str(data.get("education", "Unknown")).strip()
            if not education_str or education_str.lower() in ['none', 'null', '', 'n/a']:
                education_str = "Unknown"
                
            return clean_yoe, education_str
        else:
            return 0.0, "Unknown"
            
    except Exception as e:
        print(f"Extraction Error: {e}")
        return 0.0, "Unknown"

def extract_layout_aware_pdf_text(pdf_path):
    doc = fitz.open(pdf_path)
    full_text = []
    for page in doc:
        blocks = page.get_text("blocks")
        blocks.sort(key=lambda b: (b[0], b[1])) 
        for b in blocks:
            if b[6] == 0: 
                clean_block = b[4].strip()
                clean_block = re.sub(r'\n+', ' ', clean_block)
                if clean_block:
                    full_text.append(clean_block)
    doc.close()
    return " \n\n ".join(full_text)

def sanitize_tailored_resume(text: str) -> str:
    """Sanitizes LLM output by removing conversational filler and explanatory footers."""
    
    # 1. Truncate trailing explanations using a robust catch-all regex
    # re.DOTALL ensures that once a footer marker is hit, everything to the end of the string is removed.
    footer_pattern = re.compile(
        r'\n[#\*\-\s]*(?:I made the following changes|Changes made|Summary of changes|Explanation|Notes|Optimization summary|Key changes|Targeted rewriting|Upgrade verbs|Mirror vocabulary|Preserved technical context|Removed hallucination|No hallucination).*',
        re.IGNORECASE | re.DOTALL
    )
    text = re.sub(footer_pattern, '', text)
    
    # 2. Remove conversational intro paragraphs (e.g., "Based on the provided...")
    text = re.sub(r'(?i)^(Based on|Here is|Below is|Sure|I have).*?\n\n+', '', text)
    
    # 3. Remove "Optimized Resume" heading if the LLM injected it at the top
    text = re.sub(r'(?i)^[#\*\-\s]*Optimized Resume[#\*\-\s]*\n+', '', text)
    
    return text.strip()


# ==========================================
# MAIN ATS ENDPOINTS
# ==========================================

@app.post("/analyze")
async def analyze_resume(
    background_tasks: BackgroundTasks, 
    resume_file: UploadFile = File(...), 
    job_description_text: str = Form(None),
    job_description_file: UploadFile = File(None),
    blind_mode: str = Form("false"),
    job_id: str = Form(None),
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
                raw_jd = extract_text_from_image(temp_jd_path, file_ext)
            else: raise HTTPException(status_code=400, detail="Unsupported JD file type.")
        finally:
            if os.path.exists(temp_jd_path): os.remove(temp_jd_path)
    else:
        raw_jd = job_description_text

    cleaned_jd = clean_jd_with_llm(raw_jd)
   #print(f"\n--- DEBUG: GENERATED JD TEXT ---\n{cleaned_jd}\n--- END DEBUG ---\n")
    if not cleaned_jd or not cleaned_jd.strip(): raise HTTPException(status_code=400, detail="Could not extract valid text from JD.")
    #rint(raw_jd)
    #rint(cleaned_jd)
    temp_pdf_path = f"temp_{uuid.uuid4().hex[:6]}_{resume_file.filename}"
    with open(temp_pdf_path, "wb") as buffer: shutil.copyfileobj(resume_file.file, buffer)

    try:
        security_report = detect_fraudulent_resume(temp_pdf_path)
        if security_report.get("is_fraud"): 
            db_candidate = models.Candidate(
                job_id=int(job_id) if job_id else None,
                filename=f"🚨 [FRAUD] {resume_file.filename}",
                final_score=0.0,
                skill_overlap_score=0.0,
                semantic_score=0.0,
                lexical_score=0.0,
                matched_skills="None",
                missing_skills="ALL",
                total_yoe=0.0,
                highest_education="Unknown"
            )
            db.add(db_candidate)
            db.commit()
            raise HTTPException(status_code=406, detail=security_report)
        
        resume_text = extract_layout_aware_pdf_text(temp_pdf_path)
        if not resume_text.strip(): raise HTTPException(status_code=400, detail="Could not extract text from the PDF.")
            
        is_blind = str(blind_mode).lower() == 'true'
        final_filename = resume_file.filename
        
        if is_blind:
            resume_text = scrub_pii(resume_text)
            secure_id = uuid.uuid4().hex[:6].upper()
            final_filename = f"🔒 Anonymous_Candidate_{secure_id}.pdf"
            
        result = ai_engine.compute_hybrid_features(resume_text, cleaned_jd)
        yoe, education = extract_yoe_and_edu(resume_text)

        # SCORE CALIBRATION & DUPLICATE DETECTION
        raw_score = result["final_match_score_percentage"]
        pool_scores = []
        existing_candidate = None
        
        if job_id:
            try:
                db_job_id = int(job_id)
                
                # 1. Identify if candidate already exists in this Job Pool
                existing_candidate = db.query(models.Candidate).filter(
                    models.Candidate.job_id == db_job_id,
                    models.Candidate.filename == final_filename
                ).first()
                
                historical_cands = db.query(models.Candidate).filter(models.Candidate.job_id == db_job_id).all()
                
                # 2. Extract pool scores, EXCLUDING the candidate's old score to prevent self-anchoring
                pool_scores = [c.final_score for c in historical_cands if c.final_score is not None and c.filename != final_filename]
            except Exception as e:
                print(f"Calibration DB fetch error: {e}")
                
        calibrated_score = calibrate_hybrid_score(raw_score, pool_scores)
        result["final_match_score_percentage"] = calibrated_score
        result["raw_ml_score"] = raw_score 

        jd_skills = result["skill_analysis"]["jd_skills_detected"]
        if not jd_skills:
             result["final_match_score_percentage"] = 0.0
             result["feature_breakdown"]["skill_overlap_score"] = 0.0
             
        common_skills = result["skill_analysis"]["common_skills"]
        missing_skills = [skill for skill in jd_skills if skill not in common_skills]

        # SKILL COACH GENERATION
        ai_feedback = "Candidate possesses all requested technical skills! Excellent match."
        if missing_skills and groq_client:
            try:
                top_missing_skills = missing_skills[:4] 
                prompt = f"""
                You are a strict technical Career Coach. A candidate is missing these skills: {', '.join(top_missing_skills)}. 
                You MUST output a learning path using EXACTLY this HTML template. DO NOT use Markdown. Output ONLY the HTML.
                CRITICAL: You must generate EXACTLY {len(top_missing_skills)} cards. Do not stop early.
                
                <div class="mb-6">
                    <h3 class="text-xl font-black text-[#F7F9FC] flex items-center gap-2 drop-shadow-sm">
                        <svg class="w-6 h-6 text-[#2F6FED]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        Skill Optimization Path
                    </h3>
                    <p class="text-sm text-[#94A3B8] mt-1 font-medium">Targeted resources to close your technical gap.</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="group relative flex flex-col p-5 bg-[#242B3D]/80 backdrop-blur-md border border-[#374151] hover:border-[#2F6FED]/50 rounded-2xl shadow-lg transition-all">
                        <div class="flex items-center gap-3 mb-5">
                            <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1A1F2E] border border-[#374151] text-[#94A3B8] group-hover:border-[#2F6FED]/30 group-hover:text-[#2F6FED] transition-colors shadow-inner">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                            </div>
                            <div>
                                <h4 class="text-base font-bold text-[#F7F9FC] leading-tight drop-shadow-sm">[Skill Name]</h4>
                                <p class="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider mt-0.5">Missing Requirement</p>
                            </div>
                        </div>
                        <div class="mt-auto grid grid-cols-2 gap-2">
                            <a href="https://www.udemy.com/courses/search/?q=[Skill Name]" target="_blank" class="flex items-center justify-center py-2 px-3 bg-[#1A1F2E] hover:bg-[#2F6FED]/20 border border-[#374151] hover:border-[#2F6FED]/50 text-[#94A3B8] hover:text-[#F7F9FC] text-xs font-bold rounded-xl transition-all no-underline shadow-sm">Udemy</a>
                            <a href="https://www.youtube.com/results?search_query=[Skill Name]+tutorial" target="_blank" class="flex items-center justify-center py-2 px-3 bg-[#1A1F2E] hover:bg-[#E85D75]/20 border border-[#374151] hover:border-[#E85D75]/50 text-[#94A3B8] hover:text-[#F7F9FC] text-xs font-bold rounded-xl transition-all no-underline shadow-sm">YouTube</a>
                        </div>
                    </div>
                </div>
                """
                chat_completion = groq_client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}], 
                    model="llama-3.1-8b-instant",
                    temperature=0.1,
                    max_tokens=2500
                )
                ai_feedback = chat_completion.choices[0].message.content.strip()
            except Exception as e:
                print(f"Coach Generation Error: {e}")
                pass
        result["ai_feedback"] = ai_feedback

        # EXPLAINABLE AI DECISION PANEL
        explainable_decision = {
            "strengths": ["Matches core technical requirements."],
            "gaps": ["No major gaps identified."],
            "recommendation": "Candidate aligns well with the baseline requirements."
        }

        if groq_client:
            try:
                career_mismatch = result.get("career_compatibility", {}).get("is_mismatch", False)
                analytical_facts = {
                    "matched_skills": common_skills,
                    "missing_critical_skills": missing_skills[:5], 
                    "years_of_experience": yoe,
                    "highest_education": education,
                    "is_career_mismatch": career_mismatch
                }
                
                prompt = f"""
                You are an Expert HR AI Copilot. Translate this data into a readable Explainable AI Decision Panel.
                RAW DATA: {json.dumps(analytical_facts)}
                
                RULES:
                1. DO NOT invent skills or experience. Use ONLY the raw data.
                2. If 'is_career_mismatch' is true, your recommendation MUST state they belong to a different domain.
                3. Output EXACTLY a JSON object with keys: "strengths" (list), "gaps" (list), "recommendation" (string).
                """
                
                chat_completion = groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "You are a strict data translator. You output only valid JSON without markdown wrapping."},
                        {"role": "user", "content": prompt}
                    ], 
                    model="llama-3.1-8b-instant",
                    temperature=0.0, 
                    response_format={"type": "json_object"}
                )
                explainable_decision = json.loads(chat_completion.choices[0].message.content.strip())
                
            except Exception as e:
                print(f"Explainable AI Gen Error: {e}")
        
        result["explainable_decision"] = explainable_decision
        result["processed_filename"] = final_filename
        result["cleaned_jd"] = cleaned_jd
        result["yoe"] = yoe
        result["education"] = education

       # 3. UPSERT LOGIC (Update instead of blindly inserting duplicates)
        if existing_candidate:
            existing_candidate.final_score = result["final_match_score_percentage"]
            existing_candidate.skill_overlap_score = result["feature_breakdown"]["skill_overlap_score"]
            existing_candidate.semantic_score = result["feature_breakdown"]["semantic_score"]
            existing_candidate.lexical_score = result["feature_breakdown"]["lexical_score"]
            existing_candidate.matched_skills = ",".join(common_skills)
            existing_candidate.missing_skills = ",".join(missing_skills)
            existing_candidate.total_yoe = yoe
            existing_candidate.highest_education = education
            db.commit()
        else:
            db_candidate = models.Candidate(
                job_id=int(job_id) if job_id else None,
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

        background_tasks.add_task(ingest_resume_to_vector_db, resume_text, final_filename)
        return {"status": "success", "data": result}

       
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_pdf_path): os.remove(temp_pdf_path)

@app.post("/tailor")
async def tailor_resume(
    resume_file: UploadFile = File(...), 
    job_description: str = Form(...),
    job_id: str = Form(None),
    db: Session = Depends(get_db)
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

        pool_scores = []
        if job_id:
            try:
                historical_cands = db.query(models.Candidate).filter(models.Candidate.job_id == int(job_id)).all()
                pool_scores = [c.final_score for c in historical_cands if c.final_score is not None]
            except Exception:
                pass
            
        # =====================================================================
        # 1. RUN ORIGINAL ANALYSIS (Calibrated)
        # =====================================================================
        original_analysis = ai_engine.compute_hybrid_features(resume_text, job_description)
        orig_raw_score = original_analysis["final_match_score_percentage"]
        orig_score = calibrate_hybrid_score(orig_raw_score, pool_scores) # Apply calibration fix!
        orig_semantic = original_analysis["feature_breakdown"]["semantic_score"]
        orig_lexical = original_analysis["feature_breakdown"]["lexical_score"]
        orig_skill = original_analysis["feature_breakdown"]["skill_overlap_score"]
        
        orig_skills_detected = set([s.lower() for s in original_analysis["skill_analysis"]["resume_skills_detected"]])
        orig_career_compat = original_analysis.get("career_compatibility", {}).get("score", 0.0)

        # =====================================================================
        # 2. GENERATE TAILORED RESUME
        # =====================================================================
        system_prompt = """
        You are an Expert Technical Resume Optimizer working alongside a strict, deterministic ATS engine.
        Your goal is to maximize the resume's match score against the target Job Description (JD) without hallucinating.

        CRITICAL RULES:
        1. ZERO HALLUCINATION: You MUST NOT invent, add, or fabricate any skills, tools, roles, or experience.
        2. DO NOT CONDENSE: Preserve ALL technical context, quantified achievements, and project scale.
        3. MIRROR VOCABULARY: Find areas where the candidate's existing experience conceptually matches a requirement in the JD, and rewrite their phrasing to use the exact vocabulary of the JD.
        4. TARGETED REWRITING: Only restructure weakly worded bullet points.
        5. UPGRADE VERBS: Replace weak verbs with strong, leadership-oriented action verbs found in the JD.

        FORMATTING: Return the ENTIRE updated resume using clean Markdown format.
        """
        
        user_prompt = f"""
        <target_job_description>\n{job_description}\n</target_job_description>
        <candidate_resume>\n{resume_text}\n</candidate_resume>
        """
        
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.0,
            max_tokens=3000
        )
        
        tailored_markdown = sanitize_tailored_resume(chat_completion.choices[0].message.content.strip())
        tailored_plaintext = strip_markdown_for_analysis(tailored_markdown)
        
        # =====================================================================
        # 3. RUN NEW ANALYSIS (Calibrated)
        # =====================================================================
        new_analysis = ai_engine.compute_hybrid_features(tailored_plaintext, job_description)
        new_raw_score = new_analysis["final_match_score_percentage"]
        new_score = calibrate_hybrid_score(new_raw_score, []) # Apply calibration fix!
        new_semantic = new_analysis["feature_breakdown"]["semantic_score"]
        new_lexical = new_analysis["feature_breakdown"]["lexical_score"]
        new_skill = new_analysis["feature_breakdown"]["skill_overlap_score"]
        new_career_compat = new_analysis.get("career_compatibility", {}).get("score", 0.0)

        new_skills_detected = set([s.lower() for s in new_analysis["skill_analysis"]["resume_skills_detected"]])
        hallucinated_skills = detect_hallucinated_skills(orig_skills_detected, new_skills_detected, cutoff=0.75)

        # =====================================================================
        # 4. AUDIT & LOGIC GATES
        # =====================================================================
        audit_log = []
        verdict = "Accepted"
        ui_state = "success"
        
        if new_career_compat < 25.0:
            verdict = "Rejected"
            ui_state = "danger"
            audit_log.append("🚨 REJECTED: Optimization resulted in a severe Career Domain mismatch.")
        elif hallucinated_skills:
            verdict = "Needs Review"
            ui_state = "warning"
            audit_log.append(f"⚠️ WARNING: AI introduced unverified skills: {', '.join(hallucinated_skills).title()}.")
        elif new_score < orig_score:
            verdict = "Needs Review"
            ui_state = "warning"
            audit_log.append("⚠️ WARNING: Optimization resulted in a lower overall match score due to keyword dilution.")
        else:
            audit_log.append("✅ Passed strict anti-hallucination validation.")
            
        if new_semantic > orig_semantic: audit_log.append("✅ Improved contextual semantic alignment.")
        if new_lexical > orig_lexical: audit_log.append("✅ Optimized keyword density.")
        if new_score >= orig_score: audit_log.append("✅ Maintained mathematical authenticity.")

        return {
            "status": "success", 
            "optimization_result": {
                "verdict": verdict,
                "ui_state": ui_state,
                "is_safe_to_auto_replace": (verdict == "Accepted"),
                "audit_log": audit_log
            },
            "tailored_resume": tailored_markdown, 
            "new_score": new_score, 
            "improvement_delta": {
                "overall_score": {"original": orig_score, "optimized": new_score, "delta": round(new_score - orig_score, 1)},
                "semantic_alignment": {"original": round(orig_semantic * 100, 1), "optimized": round(new_semantic * 100, 1), "delta": round((new_semantic - orig_semantic) * 100, 1)},
                "keyword_density": {"original": round(orig_lexical * 100, 1), "optimized": round(new_lexical * 100, 1), "delta": round((new_lexical - orig_lexical) * 100, 1)},
                "skill_coverage": {"original": round(orig_skill * 100, 1), "optimized": round(new_skill * 100, 1), "delta": round((new_skill - orig_skill) * 100, 1)},
                "career_compatibility": {"original": orig_career_compat, "optimized": new_career_compat, "delta": round(new_career_compat - orig_career_compat, 1)}
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate tailored resume: {str(e)}")
    
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
            
        system_prompt = """
        You are an expert Executive Career Coach and Copywriter.
        TASK: Write a highly professional, compelling 3-paragraph cover letter for this candidate applying to this specific job.
        STRICT RULES:
        1. DO NOT invent or fabricate any experience. Only use facts from their resume.
        2. Paragraph 1: Strong opening, state the role, and a high-level summary of why they fit.
        3. Paragraph 2: Highlight 2-3 specific technical skills or projects from their resume that perfectly match the Job Description.
        4. Paragraph 3: Professional closing and call to action.
        5. Format the response beautifully in Markdown. Do not include introductory filler.
        """
        
        user_prompt = f"<target_job_description>\n{job_description}\n</target_job_description>\n<candidate_resume>\n{resume_text}\n</candidate_resume>"
            
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.5,
            max_tokens=1500
        )
        return {"status": "success", "cover_letter": chat_completion.choices[0].message.content.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to generate cover letter.")

chat_memory_cache = {}

@app.post("/chat-resume")
async def chat_with_resume(
    resume_file: UploadFile = File(...), 
    question: str = Form(...) 
):
    if not groq_client: raise HTTPException(status_code=500, detail="Groq API Key missing.")

    candidate_id = resume_file.filename
    cache_key = f"{candidate_id}_{question.lower().strip()}"
    
    if cache_key in chat_memory_cache:
        return {"status": "success", "answer": chat_memory_cache[cache_key], "cached": True}

    query_gen_prompt = f"""
    You are an AI assistant helping a recruiter search a candidate's resume.
    The recruiter asked: "{question}"
    Generate EXACTLY 3 distinct search queries. Return ONLY the queries, separated by newlines.
    """
    try:
        query_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": query_gen_prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.2 
        )
        raw_queries = query_completion.choices[0].message.content.strip()
        search_queries = [q.strip("- *\"'") for q in raw_queries.split('\n') if q.strip()]
        search_queries.append(question)
    except Exception:
        search_queries = [question] 

    all_retrieved_chunks = []
    for q in search_queries:
        chunks = retrieve_relevant_chunks(candidate_id, q, k=5) 
        all_retrieved_chunks.extend(chunks)

    unique_chunks = list(set(all_retrieved_chunks))
    if not unique_chunks:
         return {"status": "success", "answer": "I cannot find any relevant information in the resume database for this candidate."}

    context = "\n\n---\n\n".join(unique_chunks[:6])

    prompt = f"""
    You are an AI Recruiter Assistant. I am providing you with specific extracted snippets from a candidate's resume.
    User Request: "{question}"
    Retrieved Resume Snippets: <resume_context>{context}</resume_context>
    STRICT INSTRUCTIONS: Answer the question directly, concisely, and professionally using ONLY the snippets. Do not explain your reasoning.
    """
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.0 
        )
        final_answer = chat_completion.choices[0].message.content.strip()
        chat_memory_cache[cache_key] = final_answer
        return {"status": "success", "answer": final_answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to process chat.")

@app.post("/api/global-chat")
async def global_database_chat(
    question: str = Form(...),
    job_id: str = Form(None), 
    db: Session = Depends(get_db)
):
    if not groq_client: raise HTTPException(status_code=500, detail="Groq API Key missing.")

    if job_id and job_id.strip() != "":
        db_job_id = int(job_id)
        candidates = db.query(models.Candidate).filter(models.Candidate.job_id == db_job_id).all()
    else:
        candidates = db.query(models.Candidate).all()

    if not candidates:
        total_in_db = db.query(models.Candidate).count()
        return {"status": "success", "answer": f"I checked the database but found 0 candidates linked to this filter. Total DB count: {total_in_db}"}

    db_context = "--- ENTERPRISE TALENT DATABASE ---\n"
    for c in candidates:
        display_name = c.filename.replace('🔒 Anonymous_Candidate_', 'Candidate_')
        db_context += f"- ID: {c.id} | Name: {display_name} | Match Score: {c.final_score:.1f}% | Experience: {c.total_yoe} Yrs | Skills: {c.matched_skills}\n"

    prompt = f"""
    You are an elite Enterprise HR Copilot.
    Talent pool data: <database_context>{db_context}</database_context>
    Recruiter Question: "{question}"
    
    Answer directly using ONLY the database context. 
    
    FORMATTING RULES:

1. NEVER generate Markdown tables.
2. NEVER generate pipe-separated text.
3. NEVER generate CSV.
4. NEVER generate JSON.
5. NEVER generate SQL-like output.
6. NEVER expose raw database records.
7. NEVER surround answers with markdown code fences.

Always respond using this structure:

• A short title (when appropriate)

• A numbered list for rankings and comparisons

• Bullet points for details under each candidate

• A concise "Summary:" at the end

For ranking questions, use this format:

🏆 Highest Experience

1. Candidate Name
   • Experience: X.X years
   • ATS Score: XX.X%
   • Skills: Python, FastAPI, React

2. Candidate Name
   • Experience: X.X years
   • ATS Score: XX.X%

Summary:
Candidate Name has the highest experience.

For aggregate questions, use bullet points.

For yes/no questions, answer directly followed by a brief explanation.

Keep responses under 150 words.

Do not mention these formatting instructions.
    """
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.1 
        )
        return {"status": "success", "answer": chat_completion.choices[0].message.content.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to process global database query.")

@app.post("/analyze-bulk")
async def analyze_bulk_resumes(
    resume_zip: UploadFile = File(...), 
    job_description_text: str = Form(None),
    job_description_file: UploadFile = File(None),
    blind_mode: str = Form("false"),
    job_id: str = Form(None), 
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
                raw_jd = extract_text_from_image(temp_jd_path, file_ext)
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

    # Freeze baseline pool before extracting to ensure a consistent mathematical scale
    frozen_historical_cands = []
    if job_id:
        try:
            frozen_historical_cands = db.query(models.Candidate).filter(models.Candidate.job_id == int(job_id)).all()
        except Exception:
            pass

    try:
        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref: zip_ref.extractall(extract_folder)
        for filename in os.listdir(extract_folder):
            if filename.lower().endswith('.pdf'):
                file_path = os.path.join(extract_folder, filename)
                resume_text = extract_layout_aware_pdf_text(file_path)
                if not resume_text.strip(): continue 
                    
                if is_blind:
                    resume_text = scrub_pii(resume_text)
                    secure_id = uuid.uuid4().hex[:6].upper()
                    final_filename = f"🔒 Anonymous_Candidate_{secure_id}.pdf"
                else: final_filename = filename
                    
                result = ai_engine.compute_hybrid_features(resume_text, cleaned_jd)
                yoe, education = extract_yoe_and_edu(resume_text)

                # SCORE CALIBRATION & DUPLICATE DETECTION
                raw_score = result["final_match_score_percentage"]
                pool_scores = []
                existing_candidate = None
                
                if job_id:
                    try:
                        db_job_id = int(job_id)
                        
                        existing_candidate = db.query(models.Candidate).filter(
                            models.Candidate.job_id == db_job_id,
                            models.Candidate.filename == final_filename
                        ).first()
                        
                        pool_scores = [c.final_score for c in frozen_historical_cands if c.final_score is not None and c.filename != final_filename]
                    except Exception:
                        pass
                
                calibrated_score = calibrate_hybrid_score(raw_score, pool_scores)
                result["final_match_score_percentage"] = calibrated_score

                jd_skills = result["skill_analysis"]["jd_skills_detected"]
                if not jd_skills:
                     result["final_match_score_percentage"] = 0.0
                     result["feature_breakdown"]["skill_overlap_score"] = 0.0

                common_skills = result["skill_analysis"]["common_skills"]
                missing_skills = [skill for skill in jd_skills if skill not in common_skills]

                # UPSERT LOGIC
                if existing_candidate:
                    existing_candidate.final_score = result["final_match_score_percentage"]
                    existing_candidate.skill_overlap_score = result["feature_breakdown"]["skill_overlap_score"]
                    existing_candidate.semantic_score = result["feature_breakdown"]["semantic_score"]
                    existing_candidate.lexical_score = result["feature_breakdown"]["lexical_score"]
                    existing_candidate.matched_skills = ",".join(common_skills)
                    existing_candidate.missing_skills = ",".join(missing_skills)
                    existing_candidate.total_yoe = yoe
                    existing_candidate.highest_education = education
                    db.commit()
                else:
                    db_candidate = models.Candidate(
                        job_id=int(job_id) if job_id else None,
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
                raw_jd = extract_text_from_image(temp_jd_path, file_ext)
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

@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.JobDescription).filter(models.JobDescription.id == job_id).first()
    if not job: raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"status": "success", "message": f"Job #{job_id} deleted successfully."}

@app.post("/api/signup")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user: raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_pwd, role="recruiter")
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"status": "success", "message": "Account created successfully."}

@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "email": user.email}

@app.put("/api/candidates/{candidate_id}/status")
def update_candidate_status(candidate_id: int, req: StatusUpdateRequest, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate: raise HTTPException(status_code=404, detail="Candidate not found")
    candidate.pipeline_status = req.status
    candidate.is_human_overridden = True
    db.commit()
    return {"message": "Status updated successfully"}

@app.put("/api/candidates/{candidate_id}/notes")
def update_candidate_notes(candidate_id: int, req: NoteUpdateRequest, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate: raise HTTPException(status_code=404, detail="Candidate not found")
    candidate.recruiter_notes = req.notes
    db.commit()
    return {"message": "Notes updated successfully"}

@app.get("/api/candidates/{candidate_id}/interview-guide")
def generate_interview_guide(candidate_id: int, db: Session = Depends(get_db)):
    if not groq_client: raise HTTPException(status_code=500, detail="Groq API Key missing.")
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate: raise HTTPException(status_code=404, detail="Candidate not found")
        
    prompt = f"""
    You are an expert Technical Recruiter conducting an interview.
    Candidate's Verified Skills: {candidate.matched_skills}
    Candidate's Missing Skills: {candidate.missing_skills}
    Generate a targeted, 4-question interview guide for this specific candidate.
    STRICT RULES:
    1. Provide exactly 2 Technical questions verifying their matched skills.
    2. Provide exactly 1 Probe question addressing their missing skills (to gauge their ability to learn it quickly).
    3. Provide exactly 1 Behavioral/Culture Fit question.
    4. Do not include conversational filler. Output directly in clean Markdown format using headings and bullet points.
    """
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a strict technical recruiter. Output only markdown."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.3
        )
        return {"status": "success", "guide": chat_completion.choices[0].message.content.strip()}
    except Exception as e:
        print(f"Interview Gen Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate interview guide.")