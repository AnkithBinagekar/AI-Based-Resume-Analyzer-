import pandas as pd
import re

print("Loading the raw JD Dataset...")
# Assuming the file is in your data folder
df = pd.read_csv('../data/JD Dataset.csv')

print(f"Original dataset size: {len(df)} rows.")

# 1. Keep only the columns that matter for NLP training
columns_to_keep = ['jobtitle', 'jobdescription', 'skills', 'industry']
df = df[columns_to_keep]

# 2. Drop rows where the Job Description or Skills are missing
df = df.dropna(subset=['jobdescription', 'skills'])

def clean_text(text):
    if not isinstance(text, str):
        return ""
    # Remove HTML tags, special characters, and "Send me Jobs like this" boilerplate
    text = re.sub(r'Send me Jobs like this', '', text)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'[^a-zA-Z0-9\s+#\-\.]', ' ', text)
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text.lower()

print("Cleaning 22,000 Job Descriptions... (This might take a minute)")
df['clean_jd'] = df['jobdescription'].apply(clean_text)
df['clean_skills'] = df['skills'].apply(clean_text)

# Save the cleaned dataset!
output_path = '../data/cleaned_jd_dataset.csv'
df.to_csv(output_path, index=False)
print(f"Successfully saved {len(df)} cleaned rows to {output_path}!")