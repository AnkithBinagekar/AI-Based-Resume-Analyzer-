import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import re
import pickle
import numpy as np
import json
import os
from dotenv import load_dotenv
from groq import Groq

# Load Groq API Key
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

class AIResumeAnalyzerEngine:
    def __init__(self):
        print("Loading NLP Models...")
        self.nlp = spacy.load("en_core_web_sm")
        self.sbert_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        try:
            with open("ai_models/lsa_skill_model.pkl", "rb") as f:
                model_data = pickle.load(f)
                self.vocab = model_data['vocabulary']
                self.embeddings = model_data['embeddings']
        except Exception as e:
            self.vocab, self.embeddings = [], []
            
        try:
            with open("ai_models/mlp_scoring_model.pkl", "rb") as f:
                self.nn_scorer = pickle.load(f)
        except Exception as e:
            self.nn_scorer = None

    def extract_strict_skills_with_llm(self, text):
        """Uses Groq (Llama 3) to extract ONLY true technical skills and tools as a JSON array."""
        if not groq_client:
            print("⚠️ Groq API Key missing, falling back to LSA extractor.")
            return self.extract_dynamic_skills_fallback(text)
            
        try:
            prompt = f"""
            You are an ultra-strict technical ATS skill extractor. 
            Extract ONLY specific programming languages, software tools, frameworks, libraries, and distinct name-brand technologies (e.g., Python, React, AWS, Docker, PostgreSQL, PyTorch, Monai).
            
            STRICT NEGATIVE CONSTRAINTS - DO NOT EXTRACT:
            1. Broad technical domains or buzzwords (e.g., DO NOT extract "Generative AI", "Machine Learning", "Deep Learning Models", "LLMs").
            2. Generic system components (e.g., DO NOT extract "Backend Services", "Frontend Interfaces", "Databases", "Cloud Platforms", "Rest APIs").
            3. Project descriptions or pipelines (e.g., DO NOT extract "AI-Powered Web Applications", "Medical Imaging Pipelines", "Linux Environments").
            
            If it is not a specific, tangible tool, language, or framework, YOU MUST IGNORE IT.
            
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
            print(f"Skill Extraction Error (Falling back to LSA): {e}")
            return self.extract_dynamic_skills_fallback(text)

    def extract_dynamic_skills_fallback(self, text):
        """Original Spacy LSA Logic (Used as a fallback if the API fails)"""
        text = text.lower()
        found_skills = set()
                
        doc = self.nlp(text)
        for token in doc:
            word = token.text.strip()
            if word in self.vocab and token.pos_ in ['NOUN', 'PROPN']:
                found_skills.add(word)
                
        if self.vocab:
            expanded_skills = set()
            for skill in list(found_skills):
                if skill in self.vocab:
                    idx = self.vocab.index(skill)
                    target_vector = self.embeddings[idx].reshape(1, -1)
                    similarities = cosine_similarity(target_vector, self.embeddings)[0]
                    
                    top_indices = similarities.argsort()[-4:-1][::-1]
                    for i in top_indices:
                        related_word = self.vocab[i]
                        if re.search(r'\b' + re.escape(related_word) + r'\b', text):
                            expanded_skills.add(related_word)
            found_skills.update(expanded_skills)
            
        stop_words = {'experience', 'years', 'team', 'work', 'data', 'knowledge', 'design', 'project', 'business', 'system', 'technology', 'environment', 'outcomes'}
        final_skills = [s for s in found_skills if s not in stop_words and len(s) > 1]
        
        return [s.title() for s in final_skills]

    def compute_hybrid_features(self, resume_text, jd_text):
        resume_skills = self.extract_strict_skills_with_llm(resume_text)
        jd_skills = self.extract_strict_skills_with_llm(jd_text)
        
        resume_skills_lower = [s.lower() for s in resume_skills]
        common_skills = [jd_skill for jd_skill in jd_skills if jd_skill.lower() in resume_skills_lower]
                
        common_skills = list(set(common_skills))
        jd_skills = list(set(jd_skills))
        resume_skills = list(set(resume_skills))
        
        skill_score = len(common_skills) / len(jd_skills) if len(jd_skills) > 0 else 0.0
        
        res_emb = self.sbert_model.encode([resume_text])
        jd_emb = self.sbert_model.encode([jd_text])
        semantic_score = cosine_similarity(res_emb, jd_emb)[0][0]
        
        vectorizer = TfidfVectorizer(stop_words='english')
        try:
            tfidf_matrix = vectorizer.fit_transform([resume_text, jd_text])
            lexical_score = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        except:
            lexical_score = 0.0
            
        if self.nn_scorer:
            features = np.array([[skill_score, semantic_score, lexical_score]])
            # The model outputs a percentage (e.g., 15.5)
            final_score_percentage = self.nn_scorer.predict(features)[0]
            # Clamp it between 0 and 100 just to be safe
            final_score_percentage = max(0.0, min(100.0, final_score_percentage)) 
        else:
            # The fallback outputs a decimal (e.g., 0.155)
            final_score = (skill_score * 0.4) + (semantic_score * 0.4) + (lexical_score * 0.2)
            final_score_percentage = final_score * 100
            
        final_score_percentage = round(final_score_percentage, 2)
        
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
            }
        }