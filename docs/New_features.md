# ModelOps Studio — New Features & Backend Architecture Guide

## 1. Executive Summary
This document provides a comprehensive technical reference for all implemented features, backend architecture enhancements, API contracts, security models, mathematical scoring engines, and continuous governance subsystems in **ModelOps Studio**.

---

## 2. Feature 1: Bring-Your-Own-Key (BYOK) AI Gateway & Multi-Provider Architecture

### Purpose & Problem Solved
Previously, the application relied exclusively on fixed server environment variables. Users could not supply their own API keys, choose specific LLM providers, or test in isolated offline environments without cloud dependencies.

### Technical Implementation

#### A. Groq Provider Integration
- **File**: [`src/lib/ai/groq.ts`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/lib/ai/groq.ts)
- **Model**: `llama-3.1-8b-instant` (Ultra-low latency LPU inference).
- **Features**: Accepts `customApiKey` parameter, supports exponential backoff retries for 429/500+ errors, and returns typed `AIProviderResponse`.

#### B. Google Gemini Provider Integration
- **File**: [`src/lib/ai/gemini.ts`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/lib/ai/gemini.ts)
- **Model**: `gemini-1.5-flash` (Multimodal, structured JSON response mode).
- **Features**: Accepts `customApiKey` parameter, enforces `responseMimeType: application/json`, and parses structured candidates.

#### C. Dynamic Fallback Router & Provider Switcher
- **File**: [`src/lib/ai/providers.ts`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/lib/ai/providers.ts)
- **Modes Supported**:
  - `auto`: Tries Groq first; if rate-limited or unavailable, falls back automatically to Gemini; if both fail, falls back to the deterministic offline synthesizer.
  - `groq`: Forces Groq execution with user or system key.
  - `gemini`: Forces Gemini execution with user or system key.
  - `offline`: Completely bypasses external network calls and generates deterministic model cards locally.

#### D. Ephemeral Header Protocol & Zero-Retention Storage
- **Headers**:
  - `x-groq-api-key`: string (optional)
  - `x-gemini-api-key`: string (optional)
  - `x-preferred-provider`: `'auto'` | `'groq'` | `'gemini'` | `'offline'` (optional)
- **Security Guarantee**: Keys are stored client-side in the browser's `localStorage` and sent directly over encrypted HTTPS headers. The backend extracts them ephemerally in [`src/app/api/modelops/route.ts`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/app/api/modelops/route.ts) without writing to databases or log files.

#### E. Deterministic Offline Synthesizer
- **File**: [`src/lib/modelops/service.ts`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/lib/modelops/service.ts)
- **Purpose**: Generates high-fidelity, standardized model cards offline by dynamically binding user-submitted 9-section form inputs, computing metric statistics, and generating structured limitations and risks.

---

## 3. Feature 2: Full 9-Section Metadata Pipeline & Mathematical Scoring Engine

### Purpose & Problem Solved
Earlier iterations dropped form sections 3 through 9 during payload assembly, causing the backend to evaluate only partial metadata and leading to static readiness scores.

### Technical Implementation

#### A. 9-Section Schema Expansion
- **Files**: [`src/types/modelops.ts`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/types/modelops.ts), [`src/types/index.ts`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/types/index.ts), [`src/lib/modelops/validators.ts`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/lib/modelops/validators.ts)
- **9 Sections Covered**:
  1. `model_name`, `version`, `model_type`, `architecture`, `developed_by`, `release_date`, `license`
  2. `intended_use`, `primary_uses`, `out_of_scope_uses`, `target_users`
  3. `factors`, `environment`
  4. `metrics`, `decision_thresholds`, `variation_approaches`
  5. `dataset`, `eval_preprocessing`, `data_split`
  6. `training_dataset`, `data_volume`
  7. `disaggregated_results`, `subgroup_benchmarks`
  8. `uses_sensitive_data`, `impacts_human_life`, `risks_and_harms`, `mitigations`
  9. `limitations`, `reproducibility`, `recommendations`

#### B. Deterministic 5-Category Scoring Rubric
- **File**: [`src/lib/modelops/tools.ts`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/lib/modelops/tools.ts)
- **Formula & Maximum Weights (100 Points Total)**:
  - **Category 1: Model Identification (Max 10 pts)**: Model name (+5), Version (+5).
  - **Category 2: Dataset & Input Schema (Max 15 pts)**: Dataset (+7), Input shape/split/preprocessing (+4), Training dataset/volume (+4).
  - **Category 3: Quantitative Evaluation Metrics (Max 25 pts)**: $\ge 3$ metrics (+25), 2 metrics (+18), 1 metric (+10).
  - **Category 4: Governance, Risks & Limitations (Max 25 pts)**: Limitations (+10), Risks (+10), Mitigations (+5).
  - **Category 5: Verification & Testing (Max 25 pts)**: Verification tests (+15), Specific reproducibility seed/audit trail (+10).

---

## 4. Feature 3: Readiness Trend Timeline & Multi-Version Lifecycle Trajectory

### Purpose & Problem Solved
Pairwise version comparison hides silent score degradation and drift across longer release cycles. A timeline turns individual scores into an actionable lifecycle trajectory.

### Technical Implementation
- **Files**: [`src/lib/modelops/timeline.ts`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/lib/modelops/timeline.ts), [`src/components/modelops/ReadinessTimeline.tsx`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/components/modelops/ReadinessTimeline.tsx)
- **Features**:
  - Pre-seeded multi-version historical release points for all domain templates ($v0.8 \to v0.9 \to v1.0 \to v1.1 \to v1.2$).
  - Dynamic merging with current candidate release.
  - Interactive SVG line chart with area gradients, grid lines, and interactive version nodes.
  - Hover detail card revealing release date, changelog note, and metric snapshots.
  - Automated drift detection: warns if $\ge 2$ consecutive regressions occur.

---

## 5. Feature 4: “What Would It Take” (WWIT) Live Simulator & Dynamic Gap Recalculator

### Purpose & Problem Solved
Static score cards tell users what is missing, but not how much each fix is worth mathematically. The WWIT Simulator makes the rubric transparent, interactive, and actionable.

### Technical Implementation
- **Files**: [`src/lib/modelops/simulator.ts`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/lib/modelops/simulator.ts), [`src/components/modelops/WhatWouldItTakeSimulator.tsx`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/components/modelops/WhatWouldItTakeSimulator.tsx)
- **Features**:
  - Analyzes the model card and identifies specific unearned points (e.g., Missing 2nd Test Suite $\to$ +15 pts; Missing Reproducibility Seed $\to$ +10 pts; Missing Sensitive Data Mitigation $\to$ +5 pts).
  - Interactive checklist with point weights and category pills.
  - **Live Score Recalculator**: Re-runs `readiness_score` in real-time as users flip switches.
  - **"Apply Fixes to Wizard" Button**: Pre-populates the simulated specifications directly into the wizard so users can re-generate in one click.

---

## 6. Feature 5: Enterprise Governance Readiness Policy & Cryptographically Signed Audit Trail

### Purpose & Problem Solved
Moves ModelOps from a passive score generator into an enterprise governance and accountability system complying with **EU AI Act Article 14** and **NIST AI RMF**.

### Technical Implementation
- **Files**: [`src/lib/modelops/policy.ts`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/lib/modelops/policy.ts), [`src/components/modelops/PolicyAuditPanel.tsx`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/components/modelops/PolicyAuditPanel.tsx), [`src/components/modelops/AuditSignOffModal.tsx`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/components/modelops/AuditSignOffModal.tsx)
- **Standard Governance Policies**:
  1. *Healthcare & Clinical AI Compliance Policy* (Min Score: 90/100, mandatory clinical test suites & mitigations).
  2. *Financial Fraud & Credit Risk Standard* (Min Score: 85/100, mandatory latency SLA benchmark).
  3. *Generative AI & LLM Safety Guardrails* (Min Score: 85/100, mandatory safety mitigations & reproducibility seed).
  4. *Computer Vision & Edge Deployment Standard* (Min Score: 80/100, mandatory preprocessing).
  5. *Enterprise General Governance Standard* (Min Score: 75/100).
- **Features**:
  - Live compliance check returning `POLICY_PASSED` or `POLICY_BLOCKED` with detailed violation lists.
  - **Human Governance Sign-Off Modal**: Prompts for Reviewer Name, Role, Department, and Review Notes.
  - Generates an immutable, timestamped SHA-256 digital signature hash (`sha256:...`) and appends it to the model card's audit trail.

---

## 7. Feature 6: Dynamic Baseline Selection in Compare Runs

### Purpose & Problem Solved
Enables flexible model comparison across template-matched domain baselines, historical runs from the current browser session, or custom uploaded JSON files.

### Technical Implementation
- **File**: [`src/components/modelops/RunComparison.tsx`](file:///c:/Users/ahmbt/OneDrive/Desktop/ModelOps/src/components/modelops/RunComparison.tsx)
- **Features**:
  - Auto-selects the domain baseline matching the active template (e.g. Vision $\to$ ResNet50, LLM $\to$ LLaMA-3, NLP $\to$ Clinical BERT, Fraud $\to$ XGBoost).
  - Session history integration: allows picking previous runs executed during the active browser session.
  - File upload dropzone: allows uploading any external ModelCard JSON file as the comparison baseline.
  - Connects to `POST /api/modelops/compare` for authoritative metric shift analysis.

---

## 8. Summary of All Files & Related Features

| File Path | Primary Feature / Subsystem | Purpose & Functionality |
|---|---|---|
| `src/lib/ai/groq.ts` | BYOK AI Gateway | Groq LLaMA-3.1 client with custom API key support and retries |
| `src/lib/ai/gemini.ts` | BYOK AI Gateway | Google Gemini 1.5 Flash client with custom API key support |
| `src/lib/ai/providers.ts` | Multi-Provider Router | Fallback router with provider preference switching (`auto`, `groq`, `gemini`, `offline`) |
| `src/lib/modelops/timeline.ts` | Historical Intelligence | Domain release histories and drift slope detection |
| `src/lib/modelops/simulator.ts` | Gap Intelligence | Gap discovery and live prospective score recalculation math |
| `src/lib/modelops/policy.ts` | Enterprise Governance | Policy thresholds and cryptographically signed audit trail engine |
| `src/components/modelops/ReadinessTimeline.tsx` | UI Intelligence | Interactive SVG time series chart with hover tooltips |
| `src/components/modelops/WhatWouldItTakeSimulator.tsx` | UI Intelligence | Interactive gap toggle switches with live animated score gauge |
| `src/components/modelops/PolicyAuditPanel.tsx` | UI Governance | Policy compliance checker and immutable audit log table |
| `src/components/modelops/AuditSignOffModal.tsx` | UI Governance | Human sign-off modal with SHA-256 digital signature generator |
| `src/components/modelops/RunComparison.tsx` | Run Comparison UI | Template-matched baselines, session runs, and JSON upload diff matrix |
| `src/components/modelops/ResultView.tsx` | Evaluation UI | Unified 5-tab interface (Dossier, Simulator, Timeline, Policy, Compare) |
| `src/app/page.tsx` | Application Orchestration | Session history, BYOK modal state, and simulator prefill wiring |

---

## 9. Verification & Test Suite Status
- **Test Command**: `npm test`
- **Result**: **15 / 15 Test Files Passed (100%)**, **80 / 80 Tests Green**.
