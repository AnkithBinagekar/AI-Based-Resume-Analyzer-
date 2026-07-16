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
        # --- 1. DEFENSIVE TEXT CLEANING ---
        resume_text_clean = re.sub(r'\s+', ' ', resume_text).strip().lower()
        jd_text_clean = re.sub(r'\s+', ' ', jd_text).strip().lower()
        
        # --- 2. FREQUENCY-WEIGHTED SKILL EXTRACTION ---
        raw_resume_skills = self.extract_skills_local_ner(resume_text)
        raw_jd_skills = self.extract_skills_local_ner(jd_text)
        
        resume_skills = [s for s in raw_resume_skills if len(s) > 1 or s.lower() in ['c', 'r']]
        jd_skills = [s for s in raw_jd_skills if len(s) > 1 or s.lower() in ['c', 'r']]
        
        # Calculate Weight based on frequency in JD (Critical skills appear more often)
        jd_skill_weights = {}
        for skill in jd_skills:
            count = jd_text_clean.count(skill.lower())
            jd_skill_weights[skill] = 1 + count # Base weight 1 + frequency
            
        total_jd_skill_weight = sum(jd_skill_weights.values())
        
        resume_skills_lower = [s.lower() for s in resume_skills]
        common_skills = [jd_skill for jd_skill in jd_skills if jd_skill.lower() in resume_skills_lower]
        
        # Calculate Earned Weight
        earned_skill_weight = sum(jd_skill_weights[skill] for skill in common_skills)
        skill_score = earned_skill_weight / total_jd_skill_weight if total_jd_skill_weight > 0 else 0.0
        
        # --- 3. CONTRASTIVE SEMANTIC & LEXICAL VECTORS ---
        res_emb = self.sbert_model.encode([resume_text])
        jd_emb = self.sbert_model.encode([jd_text])
        raw_semantic = float(cosine_similarity(res_emb, jd_emb)[0][0])
        
        # SBERT Baseline Fix: Stretch the 0.30-1.0 range to 0.0-1.0
        semantic_score = max(0.0, (raw_semantic - 0.30) / 0.70)
        
        # Improved TF-IDF: max_df=0.85 removes generic terms (like "team", "agile", "experience")
        vectorizer = TfidfVectorizer(stop_words='english')
        try:
            tfidf_matrix = vectorizer.fit_transform([resume_text, jd_text])
            lexical_score = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
        except:
            lexical_score = 0.0
            
        # --- 4. RANDOM FOREST PREDICTION (PRESERVED CORE ARCHITECTURE) ---
        if self.rf_scorer:
            # We now feed the mathematically corrected, cleaner features into the RF
            features = np.array([[lexical_score, semantic_score, skill_score]])
            rf_prediction = self.rf_scorer.predict(features)[0]
            base_score_percentage = max(0.0, min(100.0, rf_prediction)) 
        else:
            final_score = (skill_score * 0.4) + (semantic_score * 0.4) + (lexical_score * 0.2)
            base_score_percentage = final_score * 100
            
        # --- 5. DETERMINISTIC CAREER COMPATIBILITY & POST-PENALTY ---
        career_alignment_score = (semantic_score * 0.6) + (skill_score * 0.4)
        is_career_mismatch = False
        domain_multiplier = 1.0
        
        # If alignment drops below 35%, apply a severe quadratic penalty to the RF score
        if career_alignment_score < 0.35:
            is_career_mismatch = True
            domain_multiplier = (career_alignment_score / 0.35) ** 2 

        final_score_percentage = round(base_score_percentage * domain_multiplier, 2)
        
        # --- 6. SMART ALERTS ---
        smart_alerts = []
        if is_career_mismatch:
            smart_alerts.append({
                "type": "fatal",
                "title": "Career Compatibility Mismatch",
                "message": f"The candidate's core background fundamentally misaligns with this role. A deterministic penalty was applied to the AI score."
            })
        elif career_alignment_score < 0.45:
            # Related but distinct domains (e.g., Frontend dev applying for Backend)
            smart_alerts.append({
                "type": "warning",
                "title": "Marginal Career Alignment",
                "message": f"Domains are related but not identical. Overall contextual alignment is low despite a {int(skill_score * 100)}% foundational skill match."
            })
            
        if skill_score > 0.40 and semantic_score < 0.35 and not is_career_mismatch:
            smart_alerts.append({
                "type": "warning",
                "title": "Possible Domain Shift",
                "message": "Candidate possesses the required hard skills, but their past experience context significantly differs from this role."
            })
            
        if lexical_score > 0.50 and semantic_score < 0.20:
            smart_alerts.append({
                "type": "danger",
                "title": "Lexical Anomaly Detected",
                "message": "High keyword matching with extremely low contextual meaning. Possible resume keyword stuffing."
            })

        # --- 7. UNCHANGED API CONTRACT ---
        return {
            "final_match_score_percentage": final_score_percentage,
            "feature_breakdown": {
                "skill_overlap_score": float(skill_score),
                "semantic_score": float(semantic_score),
                "lexical_score": float(lexical_score)
            },
            "skill_analysis": {
                "resume_skills_detected": list(set(resume_skills)),
                "jd_skills_detected": list(set(jd_skills)),
                "common_skills": list(set(common_skills))
            },
            "career_compatibility": {
                "score": round(career_alignment_score * 100, 1),
                "is_mismatch": is_career_mismatch
            },
            "smart_alerts": smart_alerts
        }
       