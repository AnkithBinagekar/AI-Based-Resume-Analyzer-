# scripts/train_spacy_ner.py
import spacy
from spacy.training import Example
import random
import os

print("🧠 Initializing Custom spaCy NER Training...")

# 1. Create Training Data
# Format: ("Sentence", {"entities": [(start_char, end_char, "LABEL")]})
TRAIN_DATA = [
    ("I have 3 years of experience in Python and Django.", {"entities": [(32, 38, "SKILL"), (43, 49, "SKILL")]}),
    ("Built a scalable backend using Node.js and MongoDB.", {"entities": [(31, 38, "SKILL"), (43, 50, "SKILL")]}),
    ("Proficient in React, Redux, and TailwindCSS.", {"entities": [(14, 19, "SKILL"), (21, 26, "SKILL"), (32, 43, "SKILL")]}),
    ("Deployed machine learning models using AWS and Docker.", {"entities": [(39, 42, "SKILL"), (47, 53, "SKILL")]}),
    ("Strong knowledge of PostgreSQL and Redis caching.", {"entities": [(20, 30, "SKILL"), (35, 40, "SKILL")]}),
    ("Developed REST APIs with FastAPI.", {"entities": [(14, 22, "SKILL"), (27, 34, "SKILL")]}),
    ("Experience with CI/CD pipelines using GitHub Actions.", {"entities": [(16, 21, "SKILL"), (38, 52, "SKILL")]}),
    ("Familiar with PyTorch and TensorFlow for deep learning.", {"entities": [(14, 21, "SKILL"), (26, 36, "SKILL")]}),
    ("Frontend development using HTML, CSS, and JavaScript.", {"entities": [(27, 31, "SKILL"), (33, 36, "SKILL"), (42, 52, "SKILL")]}),
    ("Managed infrastructure with Kubernetes and Terraform.", {"entities": [(28, 38, "SKILL"), (43, 52, "SKILL")]})
]

# 2. Setup a Blank spaCy English Model
nlp = spacy.blank("en")

# 3. Add the NER component to the pipeline
if "ner" not in nlp.pipe_names:
    ner = nlp.add_pipe("ner", last=True)
else:
    ner = nlp.get_pipe("ner")

# 4. Add our custom label
ner.add_label("SKILL")

# 5. Train the Model
print("🏋️ Training the NER model (this will take a few seconds)...")
optimizer = nlp.begin_training()

# Train for 30 iterations (epochs)
for itn in range(30):
    random.shuffle(TRAIN_DATA)
    losses = {}
    for text, annotations in TRAIN_DATA:
        doc = nlp.make_doc(text)
        example = Example.from_dict(doc, annotations)
        nlp.update([example], sgd=optimizer, drop=0.35, losses=losses)
    
    if itn % 5 == 0:
        print(f"Epoch {itn} - Loss: {losses['ner']:.4f}")

# 6. Save the Model
# We will save this directly to your backend/models folder
output_dir = "models/custom_skill_ner"
os.makedirs(output_dir, exist_ok=True)
nlp.to_disk(output_dir)

print(f"\n✅ Custom NER Model trained and saved to: {output_dir}")
print("You can now completely replace the Groq extraction with this local model!")