# REPORT EVIDENCE MATRIX

**Document Type:** Internal Engineering Verification & Dissertation Blueprint
**Project:** Explainable AI Recruitment Intelligence Platform
**Status:** FROZEN (Phase 4)

This document maps every technical claim to its exact implementation footprint, ensuring zero discrepancies between the dissertation and the codebase.

---

## 1. Feature-to-Evidence Mapping

| Feature | Backend Module | Frontend Component | Screenshot Required | Architecture Diagram | Demo Possible |
| --- | --- | --- | --- | --- | --- |
| **Authentication** | `main.py` (`/api/signup`, `/api/login`) | `Login.jsx` (Implied) | Yes | Yes | ✅ Yes |
| **Layout-Aware Parsing** | `main.py` (`extract_layout_aware_pdf_text`) | `CandidateDashboard.jsx` | No (Internal) | Yes | ✅ Yes (Implicit) |
| **JD OCR Extraction** | `main.py` (`extract_text_from_image`) | `CandidateDashboard.jsx` | Yes | Yes | ✅ Yes |
| **Deterministic NLP (spaCy)** | `ml_engine.py` (`extract_skills_local_ner`) | N/A | No (Internal) | Yes | ✅ Yes (Implicit) |
| **Hybrid ATS Engine** | `ml_engine.py` (`compute_hybrid_features`) | N/A | No (Internal) | Yes | ✅ Yes |
| **Explainable AI (XAI)** | `ml_engine.py`, `main.py` (Groq JSON) | `XAIDial.jsx`, `CandidateDashboard.jsx` | Yes | Yes | ✅ Yes |
| **Domain Compatibility** | `ml_engine.py` (Multiplicative Penalty) | `CandidateDashboard.jsx` | Yes | Yes | ✅ Yes |
| **Fraud Detection** | `utils/security.py`, `main.py` | `CandidateDashboard.jsx` (Alerts) | Yes | Yes | ✅ Yes |
| **Blind Hiring** | `utils/anonymizer.py` | `CandidateDashboard.jsx` (Toggle) | Yes | No | ✅ Yes |
| **Resume Tailoring** | `main.py` (`/tailor`) | `CandidateDashboard.jsx` | Yes | Yes | ✅ Yes |
| **Validation Gate** | `main.py` (`difflib` + Score Delta) | `OptimizationAuditModal.jsx` | Yes | Yes | ✅ Yes |
| **RAG Fusion Chat** | `rag_engine.py`, `main.py` (`/chat-resume`) | `CandidateDashboard.jsx` (Chat Tab) | Yes | Yes | ✅ Yes |
| **Cover Letter Gen** | `main.py` (`/generate-cover-letter`) | `CandidateDashboard.jsx` (Letter Tab) | Yes | No | ✅ Yes |
| **Global HR Search** | `main.py` (`/api/global-chat`) | `HRDashboard.jsx` (Basic UI) | Yes | No | ✅ Yes |

---

## 2. Chapter-to-Evidence Mapping

* **Chapter 3: Proposed Methodology & Architecture**
* **Evidence:** System Architecture Diagram, Multi-Vector NLP Pipeline Diagram, Mathematical formulas for TF-IDF and SBERT stretching, Multiplicative Domain Penalty formula, Random Forest architecture details, Validation Gate flowchart.


* **Chapter 4: Implementation**
* **Evidence:** Code snippets of `extract_layout_aware_pdf_text`, `ml_engine.py` (Multiplicative Gate), `/tailor` anti-hallucination logic (`difflib`), Database Schema (ER Diagram), API Endpoint table.


* **Chapter 5: Results & Evaluation**
* **Evidence:** UI Screenshots of Candidate Dashboard, XAI Radar Dial, Optimization Audit Modal (both Accepted and Rejected states), Fraud Alert banners, RAG chat responses, Tables comparing traditional ATS scores vs. Hybrid NLP scores.



---

## 3. Screenshot Checklist

### Candidate Portal / Analysis

* [ ] **Mandatory:** Upload screen with JD text box.
* [ ] **Mandatory:** Analysis Complete screen showing 75%+ score, Circular Progress Bar, and XAI Radar Dial.
* [ ] **Mandatory:** Skills breakdown tab (Matched vs. Missing).
* [ ] **Optional:** AI Logic & Fraud reasoning tab.

### AI Optimization & Validation Gate

* [ ] **Mandatory:** Optimization Audit Modal showing **SUCCESS** (Green delta, "Cleared for Deployment").
* [ ] **Mandatory:** Optimization Audit Modal showing **REJECTED** (Red delta, "Manual Review Advised", "ATS score decreased" checklist item).
* [ ] **Mandatory:** Preview Modal of the ATS-Optimized Markdown template.

### Explainability & Safety

* [ ] **Mandatory:** "Career Compatibility Mismatch" fatal alert banner (Cosine Bleed test).
* [ ] **Mandatory:** Fraud Detection alert banner (White text/Manipulation).
* [ ] **Optional:** "Lexical Anomaly" alert (Keyword stuffing).

### Copilot Features

* [ ] **Mandatory:** RAG Copilot Chat showing multi-turn Q&A.
* [ ] **Mandatory:** Generated Cover Letter tab.
* [ ] **Optional:** HTML Skill Coach learning paths.

### System Verification

* [ ] **Optional:** FastAPI Swagger UI (`/docs`) showing all endpoints.
* [ ] **Optional:** SQLite DB viewer showing `Candidate` and `JobDescription` tables.

---

## 4. Figures Required

* **Fig 3.1:** High-Level System Architecture (Client, Server, DB, LLM, Vector Store).
* **Fig 3.2:** Hybrid Scoring Pipeline (spaCy NER + SBERT + TF-IDF -> Random Forest -> Domain Gate).
* **Fig 3.3:** SBERT Baseline Stretching & Multiplicative Penalty Mathematical Model.
* **Fig 3.4:** Resume Tailoring & Validation Gate Flowchart (LLM Gen -> ATS Re-score -> difflib Check -> Verdict).
* **Fig 3.5:** RAG-Fusion Data Flow (Query -> Groq Expansion -> ChromaDB -> Groq Synthesis).
* **Fig 4.1:** Database Entity Relationship (ER) Diagram.
* **Fig 5.1 - 5.8:** Evaluative Screenshots (from Checklist above).

---

## 5. Tables Required

* **Table 2.1:** Literature Review Comparison (Traditional ATS vs LLM wrappers vs Our Validation Gate Architecture).
* **Table 3.1:** Technology Stack Justification.
* **Table 4.1:** REST API Endpoint Summary (Method, Route, Purpose, Payload).
* **Table 5.1:** Experimental Scenario Results (Expected vs Actual Scores demonstrating Domain Penalty efficacy).
* **Table 6.1:** Feature Roadmap (Implemented vs Phase 5 Future Scope).

---

## 6. Experimental Results Checklist (For Chapter 5)

**Experiment 1: The Ideal Candidate Match**

* **Input:** React/Node Full Stack Resume vs React/Node JD.
* **Expected Output:** High score (80%+), Green XAI Dial, No alerts.
* **Explanation:** Proves baseline hybrid scoring functionality.

**Experiment 2: The "Cosine Bleed" / Domain Mismatch Test**

* **Input:** React/Node Full Stack Resume vs iOS (Swift) JD.
* **Expected Output:** Score severely suppressed (15-25%), Fatal Alert: "Career Compatibility Mismatch."
* **Explanation:** Proves the Multiplicative Domain Penalty works and overcomes standard SBERT inflation.

**Experiment 3: The Keyword Stuffer (Lexical Anomaly)**

* **Input:** Terrible resume appended with raw JD keywords.
* **Expected Output:** Score suppressed, Red Alert: "Lexical Anomaly Detected."
* **Explanation:** TF-IDF spikes, but SBERT remains low, triggering the deterministic guardrail.

**Experiment 4: Successful Validation Gate (Tailoring)**

* **Input:** Good resume with weak verbs.
* **Expected Output:** Optimization Audit Modal = "Accepted", positive Score Delta.
* **Explanation:** Proves the LLM followed the dense formatting prompt and increased the baseline math.

**Experiment 5: Failed Validation Gate (Hallucination/Dilution)**

* **Input:** Strict, dense resume. LLM condenses it heavily.
* **Expected Output:** Optimization Audit Modal = "Needs Review" / "Rejected", negative Score Delta.
* **Explanation:** The crown jewel of the report. Proves the deterministic Scikit-Learn evaluator overrides the Generative AI, protecting the user.

---

## 7. Report Consistency Audit (Strict Warnings)

⚠️ **Critical Audits to verify during writing:**

* **No "Fake Confidence" Claims:** Do NOT write that the UI displays AI "Confidence." Ensure you refer to it as the "ATS Match Score" or "Mathematical Baseline."
* **HR Dashboard Limitation:** Do NOT claim a fully interactive Kanban board is implemented. Describe the HR features strictly as "Global Talent Database RAG querying and Candidate status API tracking."
* **Skill Coach Limitation:** State clearly that the Skill Coach currently relies on "LLM-injected HTML components," not native React state tracking.
* **Skill Extraction:** Ensure Chapter 3 explicitly states we moved *away* from LLM JSON extraction to `spaCy EntityRuler` for zero-latency determinism.
* **Future Scope:** Tiered Skill Gap Analysis, Model Auto-Retraining, and LinkedIn JD Scraping MUST be strictly confined to Chapter 6 (Future Work).

---

## 8. Viva Demonstration Checklist (Execution Order)

1. **System Initialization:** Show terminal (FastAPI starting, Models loading into memory).
2. **Candidate Upload (Good Match):** Upload a strong resume. Show the rotating loading text.
3. **Explainable AI:** Walk through the Circular Progress Bar, the XAI Radar Dial, and the Strengths/Concerns lists.
4. **RAG Copilot:** Ask the chatbot: *"How many years of experience does this candidate have with React?"*
5. **Resume Tailoring (The Supervisor Demonstration):**
* Click "Tailor Resume."
* Wait for LLM generation and deterministic re-scoring.
* *If it passes:* Show the Green Audit Modal and preview the markdown.
* *If it fails (even better):* Show the Red/Amber Audit Modal. Explain to the examiners: *"Notice how the deterministic ATS pipeline caught the LLM dropping semantic density, and actively recommended keeping the original document. This is our safety gate."*


6. **Domain Compatibility (The "Cosine Bleed" Defense):** Upload a Backend Resume against a Graphic Design JD. Show the massive score suppression and the "Fatal Domain Mismatch" alert.
7. **Fraud Detection:** Upload a white-text stuffed resume. Show the 406 Error and Red UI Alert.
8. **Global HR Chat:** Open HR View. Query the entire database: *"Who is the best fit for Job ID 1?"*
9. **Conclusion:** Open the "Cover Letter" tab to end on a high note.

---

## 9. Final Submission Checklist

* [ ] **Report Formatting:** Follows university guidelines (Margins, Fonts, Indexing).
* [ ] **Plagiarism/AI Check:** Ensure narrative prose is human-authored or heavily edited to pass university AI scanners.
* [ ] **Diagram Consistency:** All labels in diagrams match the terms used in the text (e.g., "Optimization Audit" not "Feedback Loop").
* [ ] **Codebase Cleanup:** Remove unused console logs, dead code, and old commented-out additive scoring logic in `ml_engine.py`.
* [ ] **Environment Variables:** `.env.example` created. DO NOT commit actual Groq API keys to GitHub.
* [ ] **Dependencies:** `requirements.txt` and `package.json` are frozen and verified working on a fresh install.
* [ ] **Local Models:** Ensure `all-MiniLM-L6-v2`, `en_core_web_sm`, and `hybrid_rf_model.pkl` instructions are clearly documented in the `README.md`.
* [ ] **Presentation Deck:** Slides mirror the Viva Demonstration Checklist order.
* [ ] **Contingency Plan:** A fully recorded, 5-minute screencast video of the Viva Demonstration saved locally in case the live API/Internet fails during the presentation.