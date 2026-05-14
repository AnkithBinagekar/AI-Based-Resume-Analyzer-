import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import re
import pickle
import joblib
import numpy as np
import json
import os
from dotenv import load_dotenv
from groq import Groq

# Load Groq API Key (Still used for Cover Letters, Tailor & Chatbot!)
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

class AIResumeAnalyzerEngine:
    def __init__(self):
        print("Loading NLP Models...")
        self.sbert_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(current_dir)
        
        # --- THE ML SCORER ---
        try:
            rf_model_path = os.path.join(backend_dir, "models", "hybrid_rf_model.pkl")
            self.rf_scorer = joblib.load(rf_model_path)
            print("✅ Random Forest Hybrid Scorer Loaded!")
        except Exception as e:
            print(f"⚠️ Could not load RF model: {e}")
            self.rf_scorer = None

        # --- THE NEW ENTERPRISE NLP PIPELINE (EntityRuler) ---
        print("Loading local spaCy NLP engine with EntityRuler...")
        self.nlp = spacy.load("en_core_web_sm")
        
        # Add the EntityRuler BEFORE the standard NER steps
        if "entity_ruler" not in self.nlp.pipe_names:
            self.ruler = self.nlp.add_pipe("entity_ruler", before="ner")
        else:
            self.ruler = self.nlp.get_pipe("entity_ruler")

        # Load your pristine, AI-cleaned dictionary
        dict_path = os.path.join(backend_dir, "output", "clean_tech_skills.json")
        try:
            with open(dict_path, "r") as f:
                clean_skills = json.load(f)
            
            # Create exact-match patterns for the engine
            patterns = [{"label": "SKILL", "pattern": skill} for skill in clean_skills]
            self.ruler.add_patterns(patterns)
            print(f"✅ Successfully loaded {len(patterns)} validated tech skills into the local AI.")
        except FileNotFoundError:
            print(f"⚠️ Warning: {dict_path} not found. Local extraction will fail.")

    def extract_skills_local_ner(self, text):
        """Uses our custom EntityRuler to extract true SKILL entities locally in milliseconds."""
        doc = self.nlp(text)
        
        found_skills = set()
        for ent in doc.ents:
            if ent.label_ == "SKILL":
                found_skills.add(ent.text.strip().title())
                
        return list(found_skills)

    def extract_strict_skills_with_llm(self, text):
        """Uses Groq (Llama 3.1) to dynamically extract skills. (Preserved for Fallback)"""
        if not groq_client:
            return []
            
        try:
            prompt = f"""
            You are an ultra-strict technical ATS skill extractor. 
            Extract ONLY specific programming languages, software tools, frameworks, libraries.
            Return the result EXACTLY as a JSON object with a single key "skills" containing a flat list of strings.
            Text to analyze:
            {text[:3000]} 
            """
            
            chat_completion = groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a strict technical skill extractor that only outputs valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.1-8b-instant",
                response_format={"type": "json_object"}
            )
            
            response_text = chat_completion.choices[0].message.content
            data = json.loads(response_text)
            skills = data.get("skills", [])
            return [str(s).title() for s in skills]
            
        except Exception as e:
            print(f"Skill Extraction Error: {e}")
            return []

    def compute_hybrid_features(self, resume_text, jd_text):
        # --- NEW DEFENSIVE TEXT CLEANING FOR OCR ---
        resume_text = re.sub(r'\s+', ' ', resume_text).strip()
        jd_text = re.sub(r'\s+', ' ', jd_text).strip()
        
        # --- THE FINAL HYBRID ARCHITECTURE ---
        # 1. Core Extraction (100% Local, Offline, Dictionary-Backed)
        raw_resume_skills = self.extract_skills_local_ner(resume_text)
        raw_jd_skills = self.extract_skills_local_ner(jd_text)
        
        # Strip random single letters just in case
        resume_skills = [s for s in raw_resume_skills if len(s) > 1 or s.lower() in ['c', 'r']]
        jd_skills = [s for s in raw_jd_skills if len(s) > 1 or s.lower() in ['c', 'r']]
        
        resume_skills_lower = [s.lower() for s in resume_skills]
        common_skills = [jd_skill for jd_skill in jd_skills if jd_skill.lower() in resume_skills_lower]
                
        common_skills = list(set(common_skills))
        jd_skills = list(set(jd_skills))
        resume_skills = list(set(resume_skills))
        
        skill_score = len(common_skills) / len(jd_skills) if len(jd_skills) > 0 else 0.0
        
        # 2. Semantic & Lexical Vectors (100% Local SBERT & TF-IDF)
        res_emb = self.sbert_model.encode([resume_text])
        jd_emb = self.sbert_model.encode([jd_text])
        semantic_score = cosine_similarity(res_emb, jd_emb)[0][0]
        
        vectorizer = TfidfVectorizer(stop_words='english')
        try:
            tfidf_matrix = vectorizer.fit_transform([resume_text, jd_text])
            lexical_score = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        except:
            lexical_score = 0.0
            
        # 3. Use Custom Local Random Forest for Final Scoring
        if self.rf_scorer:
            # Order MUST be: Lexical, Semantic, Skill Overlap
            features = np.array([[lexical_score, semantic_score, skill_score]])
            final_score_percentage = self.rf_scorer.predict(features)[0]
            final_score_percentage = max(0.0, min(100.0, final_score_percentage)) 
        else:
            final_score = (skill_score * 0.4) + (semantic_score * 0.4) + (lexical_score * 0.2)
            final_score_percentage = final_score * 100
            
        final_score_percentage = round(final_score_percentage, 2)
        
# --- NEW: ENTERPRISE SMART ALERTS LOGIC ---
        smart_alerts = []
        
        # 1. Domain Mismatch Alert
        # If they match over 40% of skills, but the semantic meaning is below 35%
        if skill_score > 0.40 and semantic_score < 0.35:
            smart_alerts.append({
                "type": "warning",
                "title": "Possible Domain Mismatch",
                "message": "Candidate possesses the required hard skills, but their past experience context significantly differs from this role."
            })
            
        # 2. Keyword Stuffing / Lexical Fraud Alert
        # If they use the exact same words (high lexical) but sentences make no sense (low semantic)
        if lexical_score > 0.50 and semantic_score < 0.20:
            smart_alerts.append({
                "type": "danger",
                "title": "Lexical Anomaly Detected",
                "message": "High keyword matching with extremely low contextual meaning. Possible resume keyword stuffing."
            })

        # Add smart_alerts to your final return dictionary
        return {
            "final_match_score_percentage": final_score_percentage,
            "feature_breakdown": {
                "skill_overlap_score": float(skill_score),
                "semantic_score": float(semantic_score),
                "lexical_score": float(lexical_score)
            },
            "skill_analysis": {
                "resume_skills_detected": resume_skills,
                "jd_skills_detected": jd_skills,
                "common_skills": common_skills
            },
            "smart_alerts": smart_alerts # <--- Add this new key!
        }

       