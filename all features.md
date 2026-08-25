# ModelOps Studio — Complete Features Guide (In Plain Terms)

Welcome to **ModelOps Studio**. This document explains every feature and capability in the application in simple, straightforward language.

---

## 1. What is ModelOps Studio?
**ModelOps Studio** is an AI Governance & Model Evaluation platform. 
In simple terms: It acts like a **health inspection and safety check for AI models**. 
Before an AI model is launched into production (or used with real customers), ModelOps checks its accuracy, data quality, safety risks, ethical mitigations, and reproducibility, and awards it a **Readiness Score out of 100**.

---

## 2. All Features Explained

### 🚀 1. One-Click Domain Templates
- **What it is**: 6 ready-made starting templates for the most common AI use cases:
  1. **LLM Fine-Tuning** (e.g. LLaMA-3 customer support bots)
  2. **Computer Vision** (e.g. ResNet image classification)
  3. **Clinical / NLP** (e.g. Medical notes triage)
  4. **Financial Fraud Detection** (e.g. Real-time transaction anomaly detection)
  5. **Recommender Systems** (e.g. E-commerce product suggestions)
  6. **Custom Blank Model** (Start from scratch)
- **Why it helps**: You don't have to fill in 30 fields by hand. Clicking a template fills in realistic benchmarks, metrics, and parameters in 1 second.

---

### 📋 2. Progressive Disclosure & 9-Step Wizard
- **What it is**: A clean 9-step guided form that gathers all the essential information about an AI model:
  - **Step 1: Model Details** (Name, version, architecture, license)
  - **Step 2: Intended Use** (Who should use it and who should NOT use it)
  - **Step 3: Factors & Hardware** (Device constraints, lighting, latency)
  - **Step 4: Performance Metrics** (Accuracy, F1 score, Latency, Loss)
  - **Step 5: Evaluation Dataset** (Test dataset name, data split, preprocessing)
  - **Step 6: Training Data** (Training dataset size and data types)
  - **Step 7: Quantitative Analyses** (Subgroup benchmarks and fairness tests)
  - **Step 8: Ethical Considerations** (Sensitive data usage, risks, and safety mitigations)
  - **Step 9: Caveats & Recommendations** (Known limitations, reproducibility random seed)
- **Why it helps**: The landing page stays clean and uncluttered. The wizard only appears when you click a template or start an evaluation.

---

### 🔑 3. Bring-Your-Own-Key (BYOK) AI Gateway & Offline Mode
- **What it is**: You can connect your own AI provider keys (Groq or Google Gemini) or run 100% offline.
- **Providers Supported**:
  - **Auto Engine**: Tries Groq first for ultra-fast response, falls back to Gemini, and falls back to Offline mode if no keys are provided.
  - **Groq Active**: Uses ultra-fast LPU inference (`llama-3.1-8b-instant`).
  - **Gemini Active**: Uses Google's `gemini-1.5-flash`.
  - **Offline Mode**: Generates complete, standardized model cards locally without using the internet or external API calls.
- **Privacy Guarantee**: Your API keys are saved **only in your browser** (`localStorage`). They are never saved in any database or backend log.

---

### 🎯 4. Objective 5-Category Readiness Score (0 to 100)
- **What it is**: An automated, transparent scoring system that calculates how "ready" a model is out of 100 points.
- **The Point Breakdown**:
  - **Identification (10 pts)**: Clear model name and version number.
  - **Dataset & Schema (15 pts)**: Benchmark dataset, data split, and preprocessing steps.
  - **Quantitative Metrics (25 pts)**: Having at least 3 distinct metrics (e.g. Accuracy + F1 + Latency).
  - **Governance & Risks (25 pts)**: Disclosing known limitations, operational risks, and safety mitigations.
  - **Verification & Testing (25 pts)**: Executed test suites and specific reproducibility audit seeds (e.g. `seed 42`).

---

### ⚡ 5. “What Would It Take” (WWIT) Live Simulator
- **What it is**: An interactive "What-If" simulator inside the evaluation results.
- **How it works**:
  - If your model scores 72/100, the simulator shows you a checklist of missing items with their exact point values (e.g., *Add a 2nd test suite $\to$ +15 pts*, *Add a reproducibility seed $\to$ +10 pts*).
  - As you flip switches, the score gauge updates **instantly on your screen** (e.g. $72 \to 97/100$).
  - **One-Click Apply**: Clicking **"Apply Fixes to Wizard"** injects the simulated fixes directly back into the form so you can generate the updated card in one click.

---

### 📈 6. Readiness Trend Timeline (Multi-Version History)
- **What it is**: An interactive SVG line graph that plots your model's readiness score across multiple release versions ($v0.8 \to v0.9 \to v1.0 \to v1.1 \to v1.2$).
- **Why it matters**: Comparing just two versions can hide long-term decline. A timeline reveals whether your model is improving over time or silently degrading over multiple releases.
- **Drift Warning**: If a model drops in score across consecutive releases, the system displays an automatic **"Drift Warning"** badge.

---

### 🛡️ 7. Governance Readiness Policy & Cryptographically Signed Audit Trail
- **What it is**: Allows teams to enforce minimum score thresholds by industry standard:
  - **Healthcare / Medical AI**: Minimum Score 90/100 (Mandatory clinical tests & sensitive data mitigations).
  - **Financial Fraud AI**: Minimum Score 85/100 (Mandatory latency SLAs).
  - **Generative AI / LLMs**: Minimum Score 85/100 (Mandatory safety guardrails).
  - **Computer Vision**: Minimum Score 80/100.
  - **General Enterprise**: Minimum Score 75/100.
- **Human Sign-Off Modal**:
  - A human reviewer enters their **Name**, **Role**, **Department**, and **Review Notes**.
  - Clicking **Authorize & Sign** generates an immutable **SHA-256 digital signature hash** (e.g. `sha256:7f83b...`) that permanently logs who approved the release and under what policy.

---

### ⚖️ 8. Side-by-Side Model Comparison Matrix (Diff Engine)
- **What it is**: A side-by-side table comparing a new candidate model against a baseline release.
- **Smart Delta Calculation**:
  - Recognizes metrics where *higher is better* (Accuracy, Precision, F1) vs. where *lower is better* (Latency, Loss, Error Rate).
  - Highlights gains in **green** and regressions in **red**.
- **Flexible Baseline Selector**:
  1. **Auto-Match Domain**: Automatically picks the matching baseline for your template (ResNet for Vision, LLaMA-3 for LLMs, Clinical BERT for NLP, XGBoost for Fraud).
  2. **Session Runs**: Pick any previous model generated in your current browser session.
  3. **Upload Baseline JSON**: Upload any past Model Card JSON file from your computer to compare against.

---

### 📥 9. One-Click Governance Report Export
- **What it is**: Export the complete evaluation dossier in 3 industry-standard formats:
  - **Copy Markdown**: Ready to paste into GitHub, Notion, or internal wikis.
  - **Download JSON Schema**: Structured machine-readable JSON containing all 16 fields and the cryptographic audit trail.
  - **Print / PDF**: Clean printer-friendly format for executive compliance audits.

---

### 🔒 10. Strict Human-in-the-Loop Safety Invariant
- **What it is**: In compliance with the **EU AI Act (Article 14)** and **NIST AI RMF**, the system strictly forbids autonomous AI systems from self-approving their own deployment.
- **How it works**: The `decision` field is permanently locked to `'pending_human_review'` until authorized by an authorized human reviewer in the Audit Trail panel.

---

### 🛠️ 11. State Machine Debugger & Path Triggers
- **What it is**: A toolbar at the bottom of the page that lets evaluators test every UI state:
  - `Idle`: Default empty state.
  - `Loading`: Pulsing skeleton screens.
  - `Empty`: 404 No Artifacts Found state.
  - `Valid-Err`: Field-level validation error state.
  - `Prov-Err`: AI provider quota / network failure state with retry button.
  - `Retry`: Re-evaluates last submitted payload.

---

## 3. Summary Table of Features

| Feature Name | Primary Purpose | How It Works |
|---|---|---|
| **Domain Templates** | Fast setup | 6 one-click buttons for LLM, Vision, NLP, Fraud, RecSys, Custom |
| **9-Step Wizard** | Complete data capture | 9-segment progress bar covering all 16 standardized model card fields |
| **BYOK AI Gateway** | User control & privacy | Connect Groq / Gemini keys or run 100% offline with zero storage |
| **Readiness Score** | Objective grading | Transparent 100-point rubric across 5 standard categories |
| **“What-If” Simulator** | Actionable gap fixing | Interactive toggles that calculate point gains live with 1-click prefill |
| **Readiness Timeline** | Lifecycle monitoring | SVG line chart of scores across releases with silent drift alerts |
| **Policy & Audit Trail** | Enterprise compliance | Industry threshold rules with SHA-256 cryptographically signed logs |
| **Run Comparison Diff** | Version benchmarking | Side-by-side metric shift table with custom JSON file upload |
| **Report Export** | Sharing & compliance | 1-click Markdown copy, JSON download, and print dossier |
| **Human-in-the-Loop Gate** | Legal safety | Permanent `pending_human_review` invariant |
