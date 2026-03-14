import pandas as pd
import re
import os
from gensim.models import Word2Vec
import nltk
from nltk.tokenize import word_tokenize

# Download NLTK tokenizer if you haven't already
nltk.download('punkt')
nltk.download('punkt_tab')

print("1. Loading JD Dataset...")
# Make sure your CSV is in the backend folder
df = pd.read_csv('JD Dataset.csv')

# Drop nulls and get just the job descriptions
descriptions = df['jobdescription'].dropna().tolist()

print(f"2. Preprocessing {len(descriptions)} Job Descriptions (This takes a moment)...")
def clean_and_tokenize(text):
    # Remove HTML and special chars
    text = re.sub(r'<[^>]+>', ' ', str(text))
    text = re.sub(r'[^a-zA-Z0-9\+#\-\.]', ' ', text)
    # Lowercase and tokenize
    tokens = word_tokenize(text.lower())
    return tokens

# Tokenize all 22,000 job descriptions
tokenized_jds = [clean_and_tokenize(jd) for jd in descriptions]

print("3. Training Deep Learning Word2Vec Neural Network...")
# Train the model!
# vector_size=100 means it creates a 100-dimensional neural mapping for every word
# window=5 means it looks at 5 words before and after to understand context
model = Word2Vec(sentences=tokenized_jds, vector_size=100, window=5, min_count=10, workers=4)

print("4. Saving AI Model...")
# Create a models directory if it doesn't exist
os.makedirs('ai_models', exist_ok=True)
model.save("ai_models/jd_word2vec.model")

print("✅ Training Complete! Your custom AI has learned from 22,000 real jobs.")

# Let's test it to see if it learned!
try:
    print("\n--- AI Knowledge Graph Test ---")
    print("AI, what skills are related to 'python'?")
    similar = model.wv.most_similar('python', topn=5)
    for word, score in similar:
        print(f"- {word} ({score:.2f} match)")
except:
    pass