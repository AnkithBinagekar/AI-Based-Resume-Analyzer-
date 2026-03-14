import pandas as pd
import spacy
import json
from collections import Counter
from tqdm import tqdm
import re
import os

print("Loading NLP engine...")
nlp = spacy.load("en_core_web_sm")

# --- CONFIGURATION ---
CSV_PATH = "../data/JD Dataset.csv"  # Ensure this matches your actual file name!
OUTPUT_PATH = "../output/dynamic_skills.json"
COLUMN_NAME = "jobdescription" 
MIN_FREQUENCY = 40 # Upgraded to 40 for strict, research-grade filtering

STOP_WORDS = {
    "experience", "years", "work", "job", "team", "company", "role", "skills", 
    "salary", "location", "benefits", "candidate", "requirements", "knowledge", 
    "ability", "industry", "client", "project", "business", "environment", "support"
}

def clean_text(text):
    """Standardizes the text before NLP processing."""
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s#\+]', ' ', text) 
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_potential_skills(text):
    """Aggressively filters noun chunks to find true technical skills."""
    doc = nlp(text)
    skills = []
    
    # Words that immediately disqualify a phrase from being a technical skill
    bad_starts = {'a', 'an', 'the', 'your', 'our', 'their', 'any', 'all', 'this', 'that', 'some'}
    
    for chunk in doc.noun_chunks:
        term = chunk.text.strip()
        words = term.split()
        
        # Rule 1: Technical skills are usually 1 to 2 words max
        if 1 <= len(words) <= 2:
            # Rule 2: Remove anything containing numbers (e.g. "1 year")
            if not any(char.isdigit() for char in term):
                # Rule 3: Must not start with articles or pronouns
                if words[0].lower() not in bad_starts:
                    # Rule 4: Must not contain our HR stop words
                    if not any(stop_word in words for stop_word in STOP_WORDS):
                        # Rule 5: Ignore standard single-word English stop words
                        if not nlp.vocab[term].is_stop:
                            # Rule 6: Ignore purely special characters
                            if len(term) > 1 and re.search('[a-zA-Z]', term):
                                skills.append(term)
    return skills

def build_dictionary():
    print(f"Loading dataset from {CSV_PATH}...")
    try:
        df = pd.read_csv(CSV_PATH)
    except FileNotFoundError:
        print(f"❌ Error: Could not find dataset at {CSV_PATH}")
        return

    actual_col = COLUMN_NAME
    if COLUMN_NAME not in df.columns:
        possible_cols = [c for c in df.columns if 'desc' in c.lower() or 'job' in c.lower()]
        if possible_cols:
            actual_col = possible_cols[0]
            print(f"⚠️ Column '{COLUMN_NAME}' not found. Using '{actual_col}' instead.")
        else:
            print(f"❌ Error: Could not find a description column. Available columns: {list(df.columns)}")
            return

    print(f"Processing {len(df)} Job Descriptions...")
    all_extracted_skills = []

    for text in tqdm(df[actual_col].dropna(), desc="Extracting Skills"):
        cleaned = clean_text(text)
        if cleaned:
            skills = extract_potential_skills(cleaned)
            all_extracted_skills.extend(skills)

    print("\nCounting frequencies and filtering noise...")
    skill_counts = Counter(all_extracted_skills)
    final_skills = {skill: count for skill, count in skill_counts.items() if count >= MIN_FREQUENCY}
    sorted_skills = sorted(list(final_skills.keys()))

    print(f"✅ Successfully extracted {len(sorted_skills)} unique skills.")

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump({"dynamic_skills": sorted_skills}, f, indent=4)
    
    print(f"💾 Dynamic Dictionary saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    build_dictionary()