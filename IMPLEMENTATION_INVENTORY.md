# IMPLEMENTATION INVENTORY

## Explainable AI Recruitment Intelligence Platform

**Document Type:** Engineering Audit & Final Freeze State
**Status:** Brutally Honest / Factual Truth

---

### A. Fully Implemented Features ✅

**1. Layout-Aware Resume Parsing**

* **Purpose:** Extract text from multi-column PDFs without breaking sentence structure across columns.
* **Frontend Modules:** `CandidateDashboard.jsx` (Dropzone)
* **Backend Modules:** `main.py` (`extract_layout_aware_pdf_text`)
* **AI/Libraries Used:** `PyMuPDF` (fitz)
* **Current Status:** Fully Implemented.
* **Notes:** Horizontally sorts bounding boxes (`x0`, then `y0`) to preserve contiguous sentences for SBERT processing.

**2. Image/PDF Job Description Extraction (OCR)**

* **Purpose:** Allow JDs to be uploaded as images or PDFs, with OCR and LLM cleanup.
* **Frontend Modules:** `CandidateDashboard.jsx` (JD File Dropzone)
* **Backend Modules:** `main.py` (`extract_text_from_image`, `clean_jd_with_llm`)
* **AI Models Used:** `PyTesseract`, Groq (Llama-3.1-8b-instant)
* **Current Status:** Fully Implemented.
* **Notes:** Falls back to raw OCR if the Groq cleanup API fails.

**3. Deterministic Skill Extraction**

* **Purpose:** Extract technical skills accurately with zero latency and zero hallucination.
* **Backend Modules:** `ml_engine.py` (`extract_skills_local_ner`)
* **AI Models Used:** `spaCy` (`en_core_web_sm`), Custom `EntityRuler`
* **Current Status:** Fully Implemented.
* **Notes:** Uses a hardcoded `clean_tech_skills.json` dictionary.

**4. Multi-Vector Hybrid NLP Scoring**

* **Purpose:** Calculate baseline alignment using three mathematical vectors.
* **Backend Modules:** `ml_engine.py`
* **AI Models Used:** SBERT (`all-MiniLM-L6-v2`), `TfidfVectorizer`
* **Current Status:** Fully Implemented.
* **Notes:** Implements baseline stretching for SBERT `(raw - 0.30) / 0.70` and `max_df=0.85` for TF-IDF. Incorporates frequency-weighted skill matching.

**5. Multiplicative Domain Compatibility & Penalization**

* **Purpose:** Solve "Cosine Bleed" by heavily penalizing candidates from unrelated engineering domains.
* **Backend Modules:** `ml_engine.py`
* **Current Status:** Fully Implemented.
* **Notes:** If semantic + skill score drops below 0.35, applies a quadratic penalty `(score / 0.35)^2` to suppress false positives.

**6. Random Forest Scoring & Sigmoid Calibration**

* **Purpose:** Map strict ML metrics to a human-readable recruiter score.
* **Backend Modules:** `ml_engine.py`, `main.py` (`calibrate_hybrid_score`)
* **AI Models Used:** `scikit-learn` Random Forest (`hybrid_rf_model.pkl`)
* **Current Status:** Fully Implemented.
* **Notes:** Uses Z-score pool normalization combined with an absolute square-root curve.

**7. Fraud Detection & Blind Hiring**

* **Purpose:** Prevent ATS manipulation (white-text stuffing) and remove PII for unbiased screening.
* **Backend Modules:** `utils/security.py`, `utils/anonymizer.py`, `main.py`
* **Current Status:** Fully Implemented.
* **Notes:** Fraud throws a 406 Error; Blind mode overrides filenames to anonymous UUIDs.

**8. Explainable AI (XAI) Metrics & Smart Alerts**

* **Purpose:** Provide transparent reasoning for AI scoring.
* **Frontend Modules:** `XAIDial.jsx`, `CandidateDashboard.jsx` (Overview Tab)
* **Backend Modules:** `ml_engine.py` (Smart Alerts array), `main.py` (Groq JSON translation)
* **Current Status:** Fully Implemented.
* **Notes:** Visually renders sub-scores and dynamic rule-based alerts (e.g., "Lexical Anomaly").

**9. AI Resume Tailoring (Validation Gate)**

* **Purpose:** Rewrite resumes to match JDs without hallucinating or losing semantic density.
* **Frontend Modules:** `CandidateDashboard.jsx` (Tailor Tab), `OptimizationAuditModal.jsx`
* **Backend Modules:** `main.py` (`/tailor` endpoint), `difflib`
* **AI Models Used:** Groq (Llama-3.1-8b-instant)
* **Current Status:** Fully Implemented.
* **Notes:** Includes fuzzy-matching anti-hallucination check.

**10. Optimization Audit Report**

* **Purpose:** Provide a strict mathematical comparison of the original vs. optimized resume.
* **Frontend Modules:** `OptimizationAuditModal.jsx`
* **Backend Modules:** `main.py` (`/tailor` return payload)
* **Current Status:** Fully Implemented.
* **Notes:** Dynamically enforces UI states (`success`, `warning`, `danger`) based on backend delta calculations. Refuses to recommend degraded drafts.

**11. RAG-Fusion Copilot (Local & Global)**

* **Purpose:** Chat interface to interrogate single candidates or the entire database.
* **Frontend Modules:** `CandidateDashboard.jsx` (Chat Tab)
* **Backend Modules:** `rag_engine.py`, `main.py` (`/chat-resume`, `/api/global-chat`)
* **AI Models Used:** `ChromaDB`, `LangChain`, Groq LLM.
* **Current Status:** Fully Implemented.
* **Notes:** Uses multi-query expansion to improve retrieval accuracy.

**12. Cover Letter Generation**

* **Purpose:** Draft a 3-paragraph context-aware letter.
* **Frontend Modules:** `CandidateDashboard.jsx` (Cover Letter Tab)
* **Backend Modules:** `main.py` (`/generate-cover-letter`)
* **Current Status:** Fully Implemented.

---

### B. Partially Implemented Features 🚧

**1. HR Dashboard UI**

* **What exists:** Backend API endpoints (`/api/candidates`, status/notes updates), `User` authentication logic, and basic UI toggles.
* **What is missing:** A dedicated, fully styled React view for recruiters to manage pipelines (Kanban board), compare multiple candidates side-by-side, and view bulk scan results persistently.
* **Remaining work:** Frontend routing and React component development for `/hr`.

**2. Interview Guide Generator**

* **What exists:** Backend API (`/api/candidates/{id}/interview-guide`) generating structured questions based on missing/matched skills.
* **What is missing:** Frontend integration to call this endpoint and display the guide in the UI.
* **Remaining work:** Add an "Interview Prep" tab or modal to the dashboard.

**3. Skill Coach (Learning Paths)**

* **What exists:** LLM successfully generates HTML cards for Udemy/YouTube searches based on missing skills.
* **What is missing:** Backend tracking of learning progress; interactive UI components (currently just injected HTML).
* **Remaining work:** Refactor HTML injection into native React components.

---

### C. Planned Features (Future Scope) 💡

* **Tiered Skill Gap Analysis (Phase 5):** Categorizing skills into "Core" vs "Secondary" mathematically.
* **Model Retraining:** Re-training the `hybrid_rf_model.pkl` on the newly generated Multiplicative Domain Penalty datasets.
* **Web Scraping Job Import:** Auto-filling the JD text box via LinkedIn/Indeed URLs using Beautiful Soup.
* **Recruiter Analytics:** Dashboards tracking time-to-hire, average match scores per role, and fraud attempt frequencies.

---

### D. Removed / Replaced Features ❌

**1. LLM-based Skill Extraction**

* **Original:** Prompting Llama-3 to extract JSON skills.
* **Why Removed:** High latency, API rate limits, and occasional hallucinations/inconsistencies.
* **Replaced With:** Local `spaCy` EntityRuler with a curated JSON dictionary.
* **Benefits:** Zero latency, 100% deterministic, offline execution.

**2. Additive Domain Scoring**

* **Original:** `Score = (0.4*Semantic + 0.4*Skill + 0.2*Lexical)`.
* **Why Removed:** Caused "Cosine Bleed" where totally unrelated roles (e.g., Video Editor vs Backend Dev) scored 60%+ due to generic resume structure.
* **Replaced With:** Multiplicative Domain Gate `(score / 0.35)^2`.
* **Benefits:** Mathematically enforces failure (10-30% scores) for incompatible domains.

**3. Automatic Resume Replacement (Blind Tailoring)**

* **Original:** User clicks "Tailor" and the AI draft replaces the original.
* **Why Removed:** AI would sometimes dilute keyword density or hallucinate, hurting the candidate's actual ATS chances.
* **Replaced With:** The Validation Gate (Optimization Audit Modal).
* **Benefits:** Human-in-the-Loop design; explicit proof of AI safety.

**4. Fake AI Confidence Score**

* **Original:** UI design showing "Confidence: 46.1%".
* **Why Removed:** Ethically and mathematically inaccurate. The number was the ATS score, not a statistical confidence interval.
* **Replaced With:** Explicit "Original Match vs. AI Draft Match" delta UI.
* **Benefits:** Academic integrity maintained for the viva.

---

### E. Final Architecture Snapshot

* **Frontend:** React (Vite) SPA, Tailwind CSS, Component-based (Dashboard, XAIDial, Audit Modal).
* **Backend:** FastAPI (Python), RESTful HTTP layer, background task worker for RAG.
* **Database:** SQLite via SQLAlchemy ORM (Tables: User, Candidate, JobDescription).
* **AI/NLP Pipeline:** PyMuPDF/PyTesseract → spaCy (NER) → SBERT (Context vectors) → TF-IDF (Lexical matrix).
* **ML Pipeline:** Random Forest Regressor → Multiplicative Penalty → Sigmoid Z-Score Calibration.
* **Validation Gate:** Groq LLM (Strict Markdown generation) → Plaintext conversion → Re-eval through ML Pipeline → `difflib` hallucination check → JSON state contract.
* **RAG Engine:** ChromaDB, Langchain Text Splitters, Groq LLM (Query Expansion/Synthesis).
* **Security:** JWT Auth, Regex white-text detection, PII scrubbing (Anonymizer).

---

### F. Report Truth Table

| Feature | Implemented | Mention in Report | Mention as Future Scope |
| --- | --- | --- | --- |
| Layout-Aware Parsing | ✅ Yes | Yes | No |
| Deterministic Scoring (spaCy) | ✅ Yes | Yes | No |
| Validation Gate / Anti-Hallucination | ✅ Yes | Yes | No |
| RAG Copilot | ✅ Yes | Yes | No |
| Explainable AI Metrics | ✅ Yes | Yes | No |
| Multiplicative Domain Penalty | ✅ Yes | Yes | No |
| **Tiered Skill Gap Analysis** | ❌ No | No | **Yes** |
| **Advanced HR Kanban UI** | ❌ No | No | **Yes** |
| **Web-Scraped JDs** | ❌ No | No | **Yes** |
| **Auto-Retraining ML Pipeline** | ❌ No | No | **Yes** |

---

### G. Viva Truth Table

| Question / Topic | Safe to Claim | Needs Qualification | Do Not Claim |
| --- | --- | --- | --- |
| Explainable AI | **Safe** (Dial, Alerts, Audit) |  |  |
| Validation Gate | **Safe** (Full implementation) |  |  |
| RAG Search | **Safe** (Local/Global DB works) |  |  |
| Domain Compatibility | **Safe** (Multiplicative math) |  |  |
| Fraud Detection | **Safe** (Catches white text) |  |  |
| Random Forest Accuracy |  | **Qualify** (Model needs retrain on new data) |  |
| HR Dashboard UI |  | **Qualify** (Backend APIs exist, UI is basic) |  |
| Interview Guide Generation |  | **Qualify** (Endpoint exists, UI missing) |  |
| Skill Coach Learning Paths |  | **Qualify** (Static HTML, not interactive DB) |  |
| Tiered Skill Gap Analysis |  |  | **Do Not Claim** |
| Auto Job Import (LinkedIn) |  |  | **Do Not Claim** |

---

### H. Final Freeze Summary

**Freeze Declaration:** The project implementation is officially **FROZEN** at Phase 4. The backend evaluation math, validation gate, RAG engine, and candidate frontend presentation layer are complete, mathematically defensible, and production-ready.

**Codebase Lockdown:** Do not modify `ml_engine.py`, `main.py` (specifically `/analyze` and `/tailor`), or `OptimizationAuditModal.jsx` until after the dissertation is submitted and the viva is complete. Modifying the scoring engine now will break synchronization with the report's methodology and results chapters.

**Deferred Enhancements:** Phase 5 (Tiered Skill Gap Analysis), robust HR Kanban UIs, and automated web scraping are officially deferred to "Future Scope" and should be documented as proposed architectural upgrades in the final chapter of the dissertation.