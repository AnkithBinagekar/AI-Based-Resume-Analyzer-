import json
import os
from dotenv import load_dotenv
from groq import Groq
from tqdm import tqdm

# Load Environment Variables (Ensure your .env file is in the root or accessible)
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("❌ ERROR: GROQ_API_KEY not found in environment.")
    exit(1)

client = Groq(api_key=GROQ_API_KEY)

INPUT_PATH = "../output/dynamic_skills.json"
OUTPUT_PATH = "../output/clean_tech_skills.json"
CHUNK_SIZE = 100  # Send 100 words to Groq at a time

def clean_skills_with_llm(noisy_skills_chunk):
    """Sends a chunk of words to Groq and asks it to filter out non-technical terms."""
    
    prompt = f"""
    You are an expert Data Scientist building a strict technical skills dictionary for an ATS system.
    
    I will provide a JSON array of words. Many of these are noise (locations, job titles, soft skills, generic nouns, verbs).
    
    YOUR TASK:
    Filter this list. Return ONLY hard, specific, technical software tools, programming languages, cloud platforms, and engineering frameworks.
    
    STRICT BLACKLIST (DO NOT INCLUDE THESE):
    1. Soft skills (e.g., leadership, communication, teamwork)
    2. Locations (e.g., London, India, Remote)
    3. Generic Job Titles/Roles (e.g., manager, engineer, developer, associate)
    4. Generic IT terms (e.g., software, hardware, systems, network, database)
    5. Benefits/HR terms (e.g., salary, dental, PTO, degree, bachelors, masters)
    6. Verbs/Actions (e.g., developing, testing, deploying)
    
    Return the result EXACTLY as a JSON object with a single key "clean_skills" containing a flat list of strings. DO NOT output Markdown.
    
    Input Array:
    {json.dumps(noisy_skills_chunk)}
    """
    
    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You only output valid JSON."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"},
            temperature=0.1
        )
        
        response_text = response.choices[0].message.content
        data = json.loads(response_text)
        return data.get("clean_skills", [])
        
    except Exception as e:
        print(f"\n⚠️ Error processing chunk: {e}")
        return []

def main():
    print(f"Loading noisy dictionary from {INPUT_PATH}...")
    try:
        with open(INPUT_PATH, "r") as f:
            data = json.load(f)
            noisy_skills = data.get("dynamic_skills", [])
    except FileNotFoundError:
        print(f"❌ Error: Could not find {INPUT_PATH}. Did you run the extraction script?")
        return

    print(f"Found {len(noisy_skills)} potential skills. Preparing for AI Sanitization...")
    
    clean_master_list = set()
    
    # Process the list in chunks to avoid overwhelming the LLM's context window
    chunks = [noisy_skills[i:i + CHUNK_SIZE] for i in range(0, len(noisy_skills), CHUNK_SIZE)]
    
    print("\nSending data to Groq for semantic cleaning...")
    for chunk in tqdm(chunks, desc="AI Processing Chunks"):
        cleaned_chunk = clean_skills_with_llm(chunk)
        # Add the cleaned skills to our master set (set automatically removes duplicates)
        for skill in cleaned_chunk:
            clean_master_list.add(skill.lower().title())
            
    final_sorted_list = sorted(list(clean_master_list))
    
    print(f"\n✅ Sanitization Complete!")
    print(f"Original Count: {len(noisy_skills)}")
    print(f"Cleaned Count: {len(final_sorted_list)}")
    print(f"Removed {len(noisy_skills) - len(final_sorted_list)} noisy words.")

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(final_sorted_list, f, indent=4)
        
    print(f"💾 Flawless Tech Dictionary saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()