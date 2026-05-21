import os
import shutil
import fitz # PyMuPDF
import zipfile
import uuid
import warnings
import pytesseract
import json
import re
import base64
from PIL import Image

# Silence Scikit-Learn feature name warnings
warnings.filterwarnings("ignore", message="X does not have valid feature names")

import platform
if platform.system() == "Windows":
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# On Linux (the cloud), pytesseract automatically finds it, so we do nothing!

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from groq import Groq

# --- NEW SECURITY IMPORTS ---
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordRequestForm
from utils.auth import get_password_hash, verify_password, create_access_token

# Import local modules
from utils.security import detect_fraudulent_resume
from utils.anonymizer import scrub_pii
from utils.ml_engine import AIResumeAnalyzerEngine
from utils.database import engine, get_db
from utils import models

# Import our RAG Engine
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

# --- SCHEMA FOR USER SIGNUP ---
class UserCreate(BaseModel):
    email: str
    password: str

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

def extract_text_from_image(image_path, file_ext):
    """Uses local OCR first, then uses Groq to perfectly clean the dirty OCR text."""
    
    # Step 1: Fast local extraction (will contain typos)
    img = Image.open(image_path)
    dirty_text = pytesseract.image_to_string(img)
    
    # Step 2: Cloud AI Cleanup
    if groq_client:
        try:
            prompt = f"""
            You are an expert OCR correction AI. I ran a Job Description marketing poster through a basic OCR, and it generated typos, bad bullet points, and formatting errors (e.g., misreading '0-1 years' as '00-lyears', turning bullet points into '¢' or '°', and cutting off words like 'EVELOPER').
            
            YOUR TASK:
            Read the dirty text below. Use your contextual understanding of software engineering job descriptions to fix all typos, restore the logical formatting, and return a perfectly clean, readable text. Do not add any conversational filler.
            
            DIRTY OCR TEXT:
            {dirty_text}
            """
            
            chat_completion = groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You only output the cleaned text. Nothing else."},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.1-8b-instant", # Using the ultra-stable, fast text model
                temperature=0.1, # Keep it highly factual
                max_tokens=2000
            )
            return chat_completion.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"⚠️ Groq OCR Cleanup failed: {e}")
            
    # Fallback to dirty text only if the internet/API completely goes down
    return dirty_text

# --- BULLETPROOF YOE & Education Extractor ---
def extract_yoe_and_edu(resume_text):
    if not groq_client: return 0.0, "Unknown"
    try:
        # We explicitly tell the AI the current date so it can calculate "Present" accurately
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
            temperature=0.0 # Force strictly deterministic output. No creativity allowed.
        )
        
        raw_response = chat_completion.choices[0].message.content.strip()
        json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        
        if json_match:
            data = json.loads(json_match.group(0))
            
            # Safely extract, convert to float, and ROUND to 1 decimal place (e.g., 2.1666 -> 2.2)
            raw_yoe = float(data.get("yoe", 0.0))
            clean_yoe = round(raw_yoe, 1) 
            
            return clean_yoe, str(data.get("education", "Unknown"))
        else:
            return 0.0, "Unknown"
            
    except Exception as e:
        print(f"Extraction Error: {e}")
        return 0.0, "Unknown"

def extract_layout_aware_pdf_text(pdf_path):
    """
    Advanced PDF extraction for multi-column resumes.
    Uses PyMuPDF bounding boxes to group text semantically.
    """
    doc = fitz.open(pdf_path)
    full_text = []
    
    for page in doc:
        # get_text("blocks") returns tuples: (x0, y0, x1, y1, "text", block_no, block_type)
        blocks = page.get_text("blocks")
        
        # CRITICAL VIVA DEFENSE LOGIC:
        # We sort by x0 (horizontal position) first, THEN y0 (vertical position).
        # This forces the parser to read the entire left column top-to-bottom,
        # before moving to the right column, preserving sentence structures for SBERT.
        blocks.sort(key=lambda b: (b[0], b[1])) 
        
        for b in blocks:
            # block_type == 0 ensures we only grab text, ignoring images/tables
            if b[6] == 0: 
                clean_block = b[4].strip()
                # Strip internal newlines so SBERT sees whole sentences, not fragments
                clean_block = re.sub(r'\n+', ' ', clean_block)
                if clean_block:
                    full_text.append(clean_block)
                    
    doc.close()
    
    # Double newlines create clean breaks between distinct sections
    return " \n\n ".join(full_text)


@app.post("/analyze")
async def analyze_resume(
    background_tasks: BackgroundTasks, 
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
                raw_jd = extract_text_from_image(temp_jd_path, file_ext)
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
        
        # --- UPGRADED: Layout-Aware Parsing ---
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

        jd_skills = result["skill_analysis"]["jd_skills_detected"]
        if not jd_skills:
             result["final_match_score_percentage"] = 0.0
             result["feature_breakdown"]["skill_overlap_score"] = 0.0
             
        common_skills = result["skill_analysis"]["common_skills"]
        missing_skills = [skill for skill in jd_skills if skill not in common_skills]

        ai_feedback = "Candidate possesses all requested technical skills! Excellent match."
        if missing_skills and groq_client:
            try:
                # 1. UI FIX: Only take the top 4 missing skills to keep the grid balanced (2x2)
                top_missing_skills = missing_skills[:4] 
                
                prompt = f"""
                You are a strict technical Career Coach. A candidate is missing these skills: {', '.join(top_missing_skills)}. 
                
                You MUST output a learning path using EXACTLY this HTML template. 
                DO NOT use Markdown. Output ONLY the HTML.
                CRITICAL: You must generate EXACTLY {len(top_missing_skills)} cards. Do not stop early.
                
                <div class="mb-6">
                    <h3 class="text-xl font-black text-slate-800 flex items-center gap-2">
                        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        Skill Optimization Path
                    </h3>
                    <p class="text-sm text-slate-500 mt-1 font-medium">Targeted resources to close your technical gap.</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="group relative flex flex-col p-5 bg-white border border-slate-200 hover:border-blue-300 rounded-2xl shadow-sm hover:shadow-md transition-all">
                        
                        <div class="flex items-center gap-3 mb-5">
                            <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                            </div>
                            <div>
                                <h4 class="text-base font-bold text-slate-800 leading-tight">[Skill Name]</h4>
                                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Missing Requirement</p>
                            </div>
                        </div>
                        
                        <div class="mt-auto grid grid-cols-2 gap-2">
                            <a href="https://www.udemy.com/courses/search/?q=[Skill Name]" target="_blank" class="flex items-center justify-center py-2 px-3 bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 text-xs font-bold rounded-xl transition-colors no-underline">
                                Udemy
                            </a>
                            <a href="https://www.youtube.com/results?search_query=[Skill Name]+tutorial" target="_blank" class="flex items-center justify-center py-2 px-3 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 text-xs font-bold rounded-xl transition-colors no-underline">
                                YouTube
                            </a>
                        </div>
                    </div>
                    </div>
                """
                
                chat_completion = groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "You are a strict output generator that only produces valid HTML."},
                        {"role": "user", "content": prompt}
                    ], 
                    model="llama-3.1-8b-instant",
                    max_tokens=2500, # 2. MEMORY FIX: Force the AI to use more tokens so it doesn't cut off
                    temperature=0.1  # Make it highly deterministic so it stops skipping instructions
                )
                ai_feedback = chat_completion.choices[0].message.content.strip()
            except Exception as e:
                print(f"Coach Generation Error: {e}")
                pass
        
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

        # --- TRIGGER RAG INGESTION ---
        background_tasks.add_task(ingest_resume_to_vector_db, resume_text, final_filename)

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
            
        system_prompt = """
        You are an Expert Executive Resume Writer. 
        
        TASK:
        Rewrite the candidate's "Professional Experience" and "Projects" bullet points to perfectly align with the target Job Description. 
        
        STRICT RULES:
        1. DO NOT invent or fabricate any experience. Only use facts from their current resume.
        2. Change the phrasing and terminology to match the keywords used in the JD.
        3. Make the bullet points punchy, impact-driven, and ATS-friendly (use action verbs).
        4. Bold the specific keywords you aligned with the JD so the candidate sees the changes.
        5. Format the entire response beautifully in Markdown. Do not include introductory filler text, just give me the tailored resume sections.
        """
        
        user_prompt = f"""
        <target_job_description>
        {job_description}
        </target_job_description>

        <candidate_resume>
        {resume_text}
        </candidate_resume>
        """
            
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.2, 
            max_tokens=3000
        )
        
        # 1. Get the newly generated resume text from Groq
        tailored_text = chat_completion.choices[0].message.content.strip()
        
        # 2. RUN THE NEW TEXT THROUGH THE RANDOM FOREST MODEL
        new_analysis = ai_engine.compute_hybrid_features(tailored_text, job_description)
        new_score = new_analysis["final_match_score_percentage"]

        return {
            "status": "success", 
            "tailored_resume": tailored_text,
            "new_score": new_score
        }

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
            
        # --- THE USER'S PREFERRED COVER LETTER PROMPT ---
        system_prompt = """
        You are an expert Executive Career Coach and Copywriter. 
        
        TASK:
        Write a highly professional, compelling 3-paragraph cover letter for this candidate applying to this specific job.
        
        STRICT RULES:
        1. DO NOT invent or fabricate any experience. Only use facts from their resume.
        2. Paragraph 1: Strong opening, state the role, and a high-level summary of why they fit.
        3. Paragraph 2: Highlight 2-3 specific technical skills or projects from their resume that perfectly match the Job Description.
        4. Paragraph 3: Professional closing and call to action.
        5. Format the response beautifully in Markdown. Do not include any introductory filler text like "Here is your cover letter", just output the letter itself.
        """
        
        user_prompt = f"""
        <target_job_description>
        {job_description}
        </target_job_description>

        <candidate_resume>
        {resume_text}
        </candidate_resume>
        """
            
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.5, # Slightly higher temperature to make the letter sound natural and persuasive
            max_tokens=1500
        )
        return {"status": "success", "cover_letter": chat_completion.choices[0].message.content.strip()}

    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to generate cover letter.")

# --- ENTERPRISE API CACHE ---
chat_memory_cache = {}

@app.post("/chat-resume")
async def chat_with_resume(
    resume_file: UploadFile = File(...), 
    question: str = Form(...) 
):
    if not groq_client:
        raise HTTPException(status_code=500, detail="Groq API Key missing.")

    candidate_id = resume_file.filename

    # 1. Create a unique cache key based on the candidate and the exact question
    cache_key = f"{candidate_id}_{question.lower().strip()}"
    
    # 2. If we already answered this, return it instantly! (0 tokens, 0ms latency)
    if cache_key in chat_memory_cache:
        print(f"⚡ [CACHE HIT] Returning saved answer for: {question}")
        return {"status": "success", "answer": chat_memory_cache[cache_key], "cached": True}

    # ========================================================
    # PHASE 3 STEP 1: MULTI-QUERY GENERATION (The "Fusion" part)
    # ========================================================
    query_gen_prompt = f"""
    You are an AI assistant helping a recruiter search a candidate's resume.
    The recruiter asked: "{question}"
    
    Generate 3 distinct search queries that would help find the answer in a resume. 
    Focus on synonyms, related technical terms, and alternative phrasings.
    
    STRICT RULES:
    1. Return ONLY the 3 queries, separated by newlines. 
    2. DO NOT include numbers, bullet points, quotes, or conversational text.
    """
    
    try:
        query_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": query_gen_prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.2 # Slight creativity to generate good synonyms
        )
        raw_queries = query_completion.choices[0].message.content.strip()
        
        # Split the generated text into a list of queries
        search_queries = [q.strip("- *\"'") for q in raw_queries.split('\n') if q.strip()]
        
        # Always append the original question just to be safe
        search_queries.append(question)
        print(f"🤖 [Fusion RAG] Generated Queries: {search_queries}")
        
    except Exception as e:
        print(f"⚠️ [Fusion RAG] Query generation failed: {e}")
        search_queries = [question] # Fallback safely to standard RAG


    # ========================================================
    # PHASE 3 STEP 2: MULTI-RETRIEVAL & DEDUPLICATION
    # ========================================================
    all_retrieved_chunks = []
    
    # Search ChromaDB for EVERY variation of the question
    for q in search_queries:
        # We use k=2 here so we don't pull too much data per query
        chunks = retrieve_relevant_chunks(candidate_id, q, k=2) 
        all_retrieved_chunks.extend(chunks)

    # Deduplicate the chunks! (If multiple queries found the same chunk, keep only one)
    unique_chunks = list(set(all_retrieved_chunks))
    
    if not unique_chunks:
         return {"status": "success", "answer": "I cannot find any relevant information in the resume database for this candidate."}

    # Cap the maximum chunks so we don't blow up the LLM context window
    final_context_chunks = unique_chunks[:6]
    context = "\n\n---\n\n".join(final_context_chunks)
    print(f"🧩 [Fusion RAG] Fused {len(final_context_chunks)} unique chunks for context.")


    # ========================================================
    # PHASE 2: CORRECTIVE EVALUATION & GENERATION
    # ========================================================
    prompt = f"""
    You are an AI Recruiter Assistant. I am giving you specific extracted snippets from a candidate's resume.
    
    User's Question: "{question}"
    
    Retrieved Resume Snippets:
    <resume_context>
    {context}
    </resume_context>
    
    CORRECTIVE INSTRUCTIONS:
    1. Check if the exact answer to the user's question is explicitly contained within the <resume_context>.
    2. If the snippets DO NOT contain the answer, you must output EXACTLY: "I cannot find this information in the candidate's resume." Do not guess, infer, or hallucinate.
    3. If the snippets DO contain the answer, provide a direct, professional response.
    
    STRICT FORMATTING RULES:
    - DO NOT use phrases like "Based on the provided resume snippets...", "I can see that...", or "Therefore, the answer is...".
    - DO NOT explain your thought process.
    - Just answer the question directly, concisely, and conversationally.
    """
        
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.0 # Strictly factual
        )
        
        final_answer = chat_completion.choices[0].message.content.strip()
        
        # 3. Save the result to our memory cache for next time
        chat_memory_cache[cache_key] = final_answer
        
        return {"status": "success", "answer": final_answer}

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

    try:
        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref: zip_ref.extractall(extract_folder)
        for filename in os.listdir(extract_folder):
            if filename.lower().endswith('.pdf'):
                file_path = os.path.join(extract_folder, filename)
                # --- UPGRADED: Layout-Aware Parsing ---
                resume_text = extract_layout_aware_pdf_text(file_path)
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
    # 1. Find the job in the database
    job = db.query(models.JobDescription).filter(models.JobDescription.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    # 2. Delete and commit
    db.delete(job)
    db.commit()
    
    return {"status": "success", "message": f"Job #{job_id} deleted successfully."}

# ==========================================
# AUTHENTICATION ROUTES
# ==========================================

@app.post("/api/signup")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # 1. Check if the email is already taken
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Hash the password securely
    hashed_pwd = get_password_hash(user.password)
    
    # 3. Save the new user to the database
    new_user = models.User(email=user.email, hashed_password=hashed_pwd, role="recruiter")
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"status": "success", "message": "Account created successfully."}

@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Note: OAuth2 expects 'username' and 'password' from the frontend form. 
    # We will pass the user's email into the 'username' field.
    
    # 1. Find the user in the database
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    # 2. Check if user exists AND password matches the hash
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Success! Generate the JWT Token
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    
    # Return the token to React so it can save it in LocalStorage
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "email": user.email
    }