import pandas as pd
import spacy
from collections import Counter
import json
import os
import re


class SkillExtractor:
    def __init__(self, csv_path):
        self.csv_path = csv_path
        self.nlp = spacy.load("en_core_web_sm")

    def load_data(self):
        df = pd.read_csv(self.csv_path)
        print(f"Loaded {len(df)} rows.")
        return df

    def clean_text(self, text):
        text = text.lower()
        text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def extract_skills(self, column_name="jobdescription"):
        df = self.load_data()

        df = df[[column_name]].dropna()

        skill_counter = Counter()

        for text in df[column_name]:
            text = self.clean_text(str(text))
            doc = self.nlp(text)

            for chunk in doc.noun_chunks:
                phrase = chunk.text.strip()

                # Keep only short phrases (1–3 words)
                if 1 <= len(phrase.split()) <= 3:
                    if len(phrase) > 2:
                        skill_counter[phrase] += 1

        return skill_counter

    def filter_skills(self, skill_counter, threshold=200):
        generic_terms = {
            "company", "candidate", "team", "work",
            "experience", "role", "environment",
            "ability", "responsibilities", "business",
            "requirements", "skills", "position"
        }

        filtered = {
            skill: count
            for skill, count in skill_counter.items()
            if count > threshold and skill not in generic_terms
        }

        return filtered

    def save_skills(self, skills_dict):
        os.makedirs("output", exist_ok=True)

        with open("output/dynamic_skills.json", "w") as f:
            json.dump(list(skills_dict.keys()), f, indent=4)

        print(f"Saved {len(skills_dict)} skills.")