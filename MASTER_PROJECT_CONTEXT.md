Here is the complete, structured **Project Context Document & Master Knowledge Base** for your final-year engineering capstone project.

This document is frozen to the current implementation state and serves as the architectural blueprint for your dissertation.

---

# Explainable AI Recruitment Intelligence Platform

## Master Project Context Document

---

## 1. Project Overview

* **Final Project Title:** Explainable AI Recruitment Intelligence Platform (formerly AI Resume Analyzer)
* **Problem Statement:** Modern Applicant Tracking Systems (ATS) rely on brittle keyword matching, filtering out qualified candidates who use different terminology. Conversely, candidates use Generative AI to stuff resumes with keywords, bypassing traditional filters. Furthermore, AI scoring models often operate as "black boxes," providing no mathematical justification to HR professionals, leading to a lack of trust in automated recruitment systems.
* **Motivation:** To build an enterprise-grade, deterministic AI recruitment pipeline that bridges the gap between semantic understanding and exact keyword matching, while strictly enforcing AI safety, explainability, and Human-in-the-Loop (HITL) workflows.
* **Objectives:**
1. Extract contextual meaning from resumes using multi-vector NLP (Semantic, Lexical, Named Entity Recognition).
2. Grade candidates using an Explainable Random Forest ensemble.
3. Provide candidates with an AI-driven resume optimization tool that cannot cheat, hallucinate, or falsely inflate scores.
4. Provide recruiters with transparent, mathematically defensible audit logs for every AI action.


* **Scope:** The system parses PDF resumes, compares them against Job Descriptions (text, image, or PDF), scores them deterministically, allows RAG-based querying, and offers safe resume tailoring and cover letter generation.
* **Final Project Positioning:** Positioned not as an automated filter, but as an **AI Copilot** for HR and Candidates. It empowers users with data but defers final decisions to human operators.
* **Evolution from Concept:** Originally designed as a standard ATS generating a single percentage score. Based on rigorous academic review, it evolved to solve "Cosine Bleed" (baseline SBERT inflation), introduced a Multiplicative Domain Penalty, and replaced a blind LLM text generator with a strict "Validation Gate" architecture.

---

## 2. Final Architecture

The platform operates on a decoupled client-server architecture.

* **Frontend (Presentation Layer):** React.js Single Page Application (SPA). Manages complex state (uploading, loading stages, XAI visualizations) and dynamically renders UI themes based on backend payload states (`success`, `warning`, `danger`).
* **Backend (Application Layer):** FastAPI framework handling concurrent requests, background tasks (RAG ingestion), file I/O operations (PDF parsing), and orchestration of the ML pipeline.
* **Database (Data Layer):** SQLite utilizing SQLAlchemy ORM. Contains tables for `User` (Recruiters), `Candidate` (historical scores, features, PII), and `JobDescription`.
* **Authentication Pipeline:** JWT (JSON Web Token) bearer authentication with `OAuth2PasswordRequestForm`. Passwords hashed via `passlib/bcrypt`.
* **AI/NLP Pipeline:**
1. **Layout-Aware PDF Extraction:** Parses multi-column resumes by sorting bounding boxes (x0, y0).
2. **Fraud & PII Filtering:** Scans for white-text stuffing and scrubs PII for Blind Hiring mode.
3. **Local spaCy EntityRuler:** Extracts technical skills deterministically using a validated JSON dictionary.
4. **Multi-Vector Encoding:** SBERT (Semantic) and TF-IDF (Lexical).


* **ML Pipeline:** A trained Random Forest Classifier (`hybrid_rf_model.pkl`) takes the three vectors and outputs a base score, which is then dynamically adjusted by business logic (Domain Penalty & Z-Score Calibration).
* **Validation Gate (Resume Tailoring):** A deterministic loop that extracts the original resume, prompts an LLM to rewrite it, strips markdown, runs the ATS pipeline on the *new* text, compares scores, detects hallucinated skills via `difflib`, and returns a safety verdict.
* **RAG Subsystem:** ChromaDB and LangChain. Ingests candidate resumes into vector space. Utilizes multi-query generation (RAG-Fusion) to retrieve snippets, which are passed to the LLM for extractive Q&A.

---

## 3. Technology Stack

* **Frontend:**
* `React.js` + `Vite`: Fast development and virtual DOM rendering.
* `Tailwind CSS`: Utility-first enterprise styling (glassmorphism UI).
* `lucide-react`: Professional, lightweight SVG icons.
* `react-circular-progressbar` & custom SVGs (XAIDial): Explainability visualizations.


* **Backend:**
* `FastAPI`: Asynchronous API handling, ideal for ML microservices.
* `SQLAlchemy`: Pythonic ORM for SQLite database management.
* `PyMuPDF (fitz)`: High-fidelity layout-aware PDF text extraction.
* `PyTesseract`: Local OCR for image-based Job Descriptions.


* **AI & Machine Learning:**
* `scikit-learn`: Random Forest modeling and TF-IDF matrix generation.
* `sentence-transformers`: Local execution of SBERT.
* `spaCy`: Industrial-strength NLP for deterministic Named Entity Recognition.
* `Groq API`: Ultra-low latency Llama-3.1-8b inference (used for translation/formatting, not core scoring).
* `ChromaDB`: Fast, local vector database for the RAG chatbot.



---

## 4. AI Models Used

1. **SBERT (`all-MiniLM-L6-v2`):** Generates dense semantic embeddings to measure contextual similarity between a resume and JD, solving the "synonym problem."
2. **TF-IDF (`TfidfVectorizer`):** Lexical analyzer with `max_df=0.85` (to filter out generic boilerplate). Measures exact vocabulary alignment and keyword density.
3. **spaCy (`en_core_web_sm` + `EntityRuler`):** Replaced LLM skill extraction. Uses a curated JSON dictionary of tech skills for 100% deterministic, zero-latency extraction.
4. **Random Forest Classifier:** An ensemble machine learning model trained on historical data to weigh semantic, lexical, and skill overlap scores into a baseline percentage.
5. **Llama-3.1-8b-instant (via Groq):** The generative engine. Kept on a tight leash (low temperature). Used for: Data-to-JSON translation (XAI panel), OCR text cleanup, RAG synthesis, Cover Letter generation, and ATS-guided resume rewriting.

---

## 5. Backend APIs

* `POST /analyze`: Single file pipeline. Extracts text, runs ML engine, calibrates score, translates JSON feedback via Groq, saves to DB, and triggers background RAG ingestion.
* `POST /analyze-bulk`: Accepts a `.zip` file, iterates through PDFs, runs the pipeline iteratively, and returns an array of scores ranked highest to lowest.
* `POST /tailor`: The Validation Gate. Requires `resume_file` and `job_description`. Returns the `tailored_markdown`, score delta, `difflib` hallucination check, and UI state contract (`is_safe_to_auto_replace`).
* `POST /generate-cover-letter`: Takes file and JD, prompts Groq with strict boundaries to generate a 3-paragraph Markdown letter without hallucinating experience.
* `POST /chat-resume`: RAG-Fusion endpoint. Takes `candidate_id` and `question`. Uses Groq to generate 3 search variations, queries ChromaDB, and synthesizes a factual answer. Features in-memory caching for speed.
* `POST /api/global-chat`: Enterprise talent search. Loads all DB candidates for a specific Job ID into the prompt context for global ranking and summarization.
* **Job Management:** `GET /api/jobs`, `POST /api/jobs`, `DELETE /api/jobs/{id}`.
* **Auth:** `POST /api/signup`, `POST /api/login` (OAuth2 token generation).

---

## 6. Core Algorithms & Logic Pipelines

* **Layout-Aware PDF Parsing:** Sorts PDF bounding boxes horizontally (`x0`) then vertically (`y0`). Prevents multi-column resumes from being read across columns, preserving sentence structure for SBERT.
* **Frequency-Weighted Skill Matching:** Calculates how many times a skill appears in the JD. Missing a skill mentioned 5 times (weight = 6) penalizes the `skill_score` much heavier than missing a skill mentioned once (weight = 2).
* **SBERT Baseline Correction:** Sentences naturally share ~0.30 cosine similarity. The algorithm dynamically stretches the `0.30 -> 1.0` range to act as `0.0 -> 1.0` `(raw - 0.30) / 0.70`, mathematically widening the gap between average and excellent candidates.
* **Multiplicative Domain Penalty (Solving Cosine Bleed):** Base Random Forest scores often inflate due to generic engineering terms. We calculate a deterministic `career_alignment_score` (60% Semantic, 40% Hard Skills). If this falls below 0.35, the algorithm squares the ratio `(score / 0.35)^2` and multiplies it against the RF output, severely dragging unrelated domains down to 10-30%.
* **Anti-Hallucination Validation (difflib):** Compares extracted skills from the original resume against the AI-tailored resume. If the AI introduces a new skill not found in the original, fuzzy matching (`cutoff=0.75`) verifies it. If it's a true hallucination, the UI flags the draft as "Needs Review."
* **Hybrid Z-Score Calibration:** Maps the strict ML score to recruiter expectations. Blends an absolute non-linear curve (`sqrt(score) * 10`) with a pool-based Z-score mapped via a Sigmoid function. Stretches a strict 65% ML score to a human-readable 80%.

---

## 7. UI Modules (React)

* **Analysis Portal:** Dropzone for PDFs/ZIPs and JDs. Rotates loading text to indicate ML pipeline stages.
* **Overview Tab:** Displays final score (Circular Progress Bar), Smart Alerts (fatal/warnings), top metrics, the XAI Radar Dial, and dynamic Strengths/Concerns lists.
* **Skills Tab:** Renders verified matched skills (Green) vs missing requirements (Amber).
* **AI Logic & Fraud Tab:** Explicitly explains the Random Forest and Domain Penalty reasoning to the recruiter. Flags metadata manipulation.
* **Coach Tab (HTML Injection):** Uses Groq to generate dynamic Udemy/YouTube learning paths in structured HTML for the top 4 missing skills.
* **Tailor Resume Tab:** The interactive Validation Gate. Displays the "Optimization Audit Report" comparing the Original vs AI Revision, complete with score deltas and conditional download buttons based on safety.
* **RAG Copilot Tab:** A chat interface initialized with suggested prompts to interrogate the candidate's vector database.

---

## 8. Explainable AI (XAI) Features

The project completely dismantles the "Black Box" AI paradigm:

1. **Metric Exposure:** Does not just show "75%". Breaks it down into Semantic, Lexical, and Skill Overlap percentages.
2. **Audit Logs:** Generates a deterministic array of actions taken during resume tailoring (e.g., "⚠ Semantic similarity decreased").
3. **UI State Enforcement:** The UI visually rejects optimizations that fail mathematical thresholds (Red/Amber/Green themes tied directly to delta math).
4. **Smart Alerts:** Explains *why* an applicant scored high/low (e.g., "Domain Shift: Has skills but wrong context").

---

## 9. Research Contributions for Dissertation

What elevates this from a standard college project to enterprise-grade engineering:

1. **Solving Cosine Bleed:** Most NLP projects fail because SBERT treats all engineering documents similarly. The *Multiplicative Domain Penalty* and *SBERT Stretching* solve this deterministically.
2. **The Validation Gate Architecture:** Rather than wrapping a UI around an LLM API, this project uses the LLM as a sub-component managed by a deterministic Scikit-Learn supervisor.
3. **Fuzzy Anti-Hallucination Check:** Moving beyond simple prompt engineering ("don't hallucinate") to actual programmatic verification using `difflib` set subtraction.
4. **Human-in-the-Loop (HITL) Design:** The system explicitly refuses to overwrite user data if the AI performs poorly, dynamically shifting the UX to "Recommend Original."

---

## 10. Features Removed During Development

* **Pure LLM JSON Extraction:** Originally used Llama-3.1 to extract skills. *Removed* because it added latency, incurred API costs, and occasionally hallucinated. Replaced with local `spaCy` for deterministic, zero-latency extraction.
* **Additive Domain Scoring:** Originally, domain compatibility was just a weighted addition. *Removed* because candidates with 0% skills still passed based on generic semantic phrasing. Replaced with Multiplicative Gating.
* **Fake AI Confidence Score:** Initially proposed in the UI. *Removed* to maintain academic integrity, as the 46.1% was the ATS match score, not a statistical model confidence interval.

---

## 11. Current Limitations

1. **Random Forest Stagnation:** The `hybrid_rf_model.pkl` was trained on older, additive data. While the current pipeline feeds it cleaner data, the model itself should ideally be retrained on the new Multiplicative Domain distribution.
2. **Static Skill Dictionary:** The local `spaCy` extraction relies on `clean_tech_skills.json`. If a brand new framework is released, the dictionary must be manually updated.
3. **OCR Brittleness:** PyTesseract struggles with heavily stylized or low-res image JDs, relying heavily on the Groq LLM cleanup pass to function.

---

## 12. Future Scope (Including Phase 5)

* **Phase 5: Tiered Skill Gap Analysis:** Implementing logic to categorize missing skills into "Core/Fatal" vs "Secondary/Trainable" to better inform the scoring engine.
* **Model Retraining:** Generating a synthetic dataset using the new scoring engine to train a more accurate XGBoost or Random Forest model.
* **Web Scraping JD:** Allowing recruiters to paste a LinkedIn/Indeed URL and using Beautiful Soup to automatically extract the JD text.

---

## 13. Complete Development Timeline (Architectural Decisions)

* **Phase 1 (Core ML):** Transitioned from keyword matching to a Hybrid NLP pipeline (SBERT + TF-IDF + NER). Implemented Random Forest scoring.
* **Phase 2 (Explainability):** Built the XAI Radar dial and translated raw arrays into human-readable JSON using `temperature=0.0` LLM prompts.
* **Phase 3 (Calibration):** Implemented the Hybrid Z-Score Sigmoid function to normalize strict mathematical distributions for human psychology.
* **Phase 4 (The Validation Gate):** Built the Resume Tailoring feature. Transitioned from blindly accepting LLM output to comparing Pre/Post text deterministically.
* **Phase 4.5 (Scoring Redesign):** Discovered "Cosine Bleed." Re-architected `ml_engine.py` to use frequency-weighting and multiplicative penalties while preserving the RF model.
* **Phase 4.9 (UI Polish):** Mapped backend UI states (`success`, `warning`, `danger`) strictly to frontend Tailwind rendering to establish a Single Source of Truth.

---

## 14. Viva Preparation Notes (Defending the Architecture)

* **Q: Why use Groq instead of OpenAI?**
* *Defense:* Groq utilizes LPUs (Language Processing Units) which provide ultra-low latency inference, crucial for synchronous operations like generating an XAI panel while the user waits for a loading screen.


* **Q: Why didn't you just use Prompt Engineering to stop hallucinations?**
* *Defense:* Prompt engineering is probabilistic and can fail. I built a deterministic supervisor. The python backend extracts the new skills, subtracts them from the original skills, and uses `difflib` to catch any unauthorized additions.


* **Q: How do you handle candidates keyword-stuffing their resumes?**
* *Defense:* The algorithm separates Lexical (keywords) from Semantic (context). If Lexical is > 0.50 but Semantic is < 0.20, the system triggers a "Lexical Anomaly" fraud alert and suppresses the score.


* **Q: Why does the system sometimes recommend the *original* resume over the AI draft?**
* *Defense:* LLMs often condense text to format it cleanly. If the LLM condenses too much, the resume loses its Semantic Density (SBERT score drops). The system calculates the score delta and actively protects the candidate by recommending the mathematically superior version.



---

## 15. Report Writing Notes (Chapter Mapping)

* **Introduction:** Focus on the problem of "Black Box ATS" and the arms race between candidates using ChatGPT to cheat and recruiters struggling to filter them.
* **Literature Review:** Contrast standard TF-IDF models (old ATS) against transformer models (SBERT/BERT). Discuss the ethical implications of automated hiring and the necessity of Human-in-the-Loop systems.
* **Methodology:** Detail the mathematical redesign (Cosine Bleed, Multiplicative Domain Penalty, Frequency-Weighted Skills). Explain the "Validation Gate" supervisor concept.
* **Implementation:** Document the FastAPI integration, the React UI conditional rendering based on backend state contracts, and the local `spaCy` setup.
* **Results:** Show screenshots of the Optimization Audit modal where a score drops and the UI turns amber/red. This is your greatest achievement.
* **Conclusion:** Summarize how the project successfully evolved from an automated filter into an Explainable AI Copilot that empowers human decision-making.