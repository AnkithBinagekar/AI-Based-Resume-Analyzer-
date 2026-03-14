import pandas as pd
import re
import os
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity

print("1. Loading JD Dataset...")
df = pd.read_csv('data/JD Dataset.csv')
descriptions = df['jobdescription'].dropna().tolist()

print(f"2. Cleaning {len(descriptions)} Job Descriptions (This takes a moment)...")
def clean_text(text):
    text = re.sub(r'<[^>]+>', ' ', str(text))
    # Keep alphanumeric, plus, hash (for C++, C#)
    text = re.sub(r'[^a-zA-Z0-9\+#]', ' ', text)
    return text.lower()

cleaned_jds = [clean_text(jd) for jd in descriptions]

print("3. Training LSA Deep Semantic Model (TF-IDF + SVD)...")
# Step A: Find the top 5,000 most important technical words across all jobs
vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
tfidf_matrix = vectorizer.fit_transform(cleaned_jds)

# Step B: Use Singular Value Decomposition (SVD) to create mathematical Word Embeddings
# We transpose the matrix (.T) so the AI learns about WORDS, not documents
svd = TruncatedSVD(n_components=100, random_state=42)
word_embeddings = svd.fit_transform(tfidf_matrix.T)

print("4. Saving AI Knowledge Graph...")
os.makedirs('ai_models', exist_ok=True)
with open('ai_models/lsa_skill_model.pkl', 'wb') as f:
    pickle.dump({
        'vocabulary': list(vectorizer.get_feature_names_out()),
        'embeddings': word_embeddings
    }, f)

print("✅ Training Complete! Testing AI Knowledge Graph...")

# Let's test if the AI learned what skills go together!
vocab = list(vectorizer.get_feature_names_out())
if 'python' in vocab:
    idx = vocab.index('python')
    target_vector = word_embeddings[idx].reshape(1, -1)
    similarities = cosine_similarity(target_vector, word_embeddings)[0]
    
    # Get top 5 most similar words
    top_indices = similarities.argsort()[-6:-1][::-1]
    
    print("\n--- AI Knowledge Graph Test ---")
    print("AI, based on 22,000 JDs, what skills are related to 'python'?")
    for i in top_indices:
        print(f"- {vocab[i]} ({similarities[i]:.2f} match)")