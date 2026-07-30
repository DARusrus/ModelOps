# AI Usage & Architecture Documentation

> **Role:** Senior AI Backend Engineer (Haneen)  
> **Last Updated:** 2026-07-22

---

## 1. Provider Strategy & Resilience

ModelOps uses a dual-provider architecture to balance speed and accuracy while guaranteeing zero downtime:

| Role | Provider | Model | Temperature | Response Format |
|---|---|---|---|---|
| **Primary** | Groq | `llama-3.3-70b-versatile` | `0.1` | JSON object (`type: "json_object"`) |
| **Fallback** | Google Gemini | `gemini-1.5-flash` | `0.1` | JSON object (`responseMimeType: "application/json"`) |

### Provider Failover Logic
1. **Primary Call:** `generateGroqResponse()` is called with a 30s timeout.
2. **Failover Trigger:** If Groq fails (missing API key, rate limit, timeout, 5xx server error), the system logs the error and immediately falls back to `generateGeminiResponse()`.
3. **Offline Fallback:** If both providers fail or keys are absent in dev environments, `processModelOpsRequest()` deterministically synthesizes a compliant Model Card grounded in the provided experiment metadata without throwing unhandled exceptions.

---

## 2. Prompt Engineering & Anti-Hallucination

Prompts are constructed modularly in `src/lib/ai/prompts.ts` (`buildModelCardPrompt`):

- **Strict Grounding:** Prompts instruct the LLM to output details *strictly* grounded in provided experiment metadata.
- **Anti-Hallucination:** Explicit rules prohibit inventing performance metrics, data statistics, or unperformed tests.
- **Missing Data Handling:** If a field is missing in input data, the LLM is instructed to list it under limitations or warnings rather than making assumptions.
- **JSON-only Enforcement:** Responses are constrained to JSON without markdown codeblock wrappers.

---

## 3. Output Validation & Sanitation

Raw LLM responses pass through `parseAndValidateAIResponse()` in `src/lib/ai/validators.ts`:

1. Codeblock wrappers (```json) are stripped.
2. JSON is parsed safely with fallback error handling.
3. Input metadata is merged to ensure critical parameters (model name, version, dataset) are never lost.
4. Output is validated against `ModelCardOutputSchema` (Zod).
5. **Deterministic Overrides:** `readiness_score` is computed purely deterministically by `readiness_score()` tool. The AI cannot tamper with readiness scoring.
6. **Governance Rule:** `decision` is always set to `"pending_human_review"`.

---

## 4. Backend Log & Traceability

- Operations log start time, model name, selected AI provider, latency in ms, and readiness score.
- API keys, secrets, and raw bearer tokens are strictly omitted from logs.

---

## AI Usage — Ahmed Amir Rusrus (Integration Lead / Solution Architect)

> **Last Updated:** 2026-07-29

### Tools Used

| Tool | Purpose |
|------|---------|
| Antigravity (Google DeepMind coding agent) | Architecture documentation drafting, CI/CD workflow generation, security checklist, contribution matrix, e2e test scaffolding |
| GitHub Copilot | Inline suggestions during `.github/` and `docs/` file editing |

### Tasks Delegated to AI

| Task | File(s) Produced | Verification Method |
|------|------------------|---------------------|
| GitHub Actions CI workflow | `.github/workflows/ci.yml` | Reviewed all 4 steps manually; verified env var handling matches `src/lib/env.ts`; confirmed test runner is `vitest run` matching `package.json` |
| E2E workflow tests | `tests/e2e/workflow.test.ts` | All imports verified against actual paths in `src/`; test cases cross-checked against `tests/fixtures/modelops/sample-experiments.json` and `src/lib/modelops/schema.ts` |
| Contribution matrix | `docs/contribution-matrix.md` | Every file listed verified to exist in repo; ownership verified against `docs/architecture.md` §3 Module Ownership |
| Security checklist | `docs/security-checklist.md` | Reviewed against OWASP LLM Top 10 and Next.js production checklist |
| Smoke test script | `scripts/smoke-test.sh` | Routes verified against `docs/api-contracts.md`; expected responses verified against `src/lib/modelops/validators.ts` |

### Files Written Directly by Ahmed (not AI-generated)

- `README.md` — written directly
- `docs/architecture.md` — written directly; reviewed by all members before Session 2 gate
- `docs/api-contracts.md` — written directly; agreed by all members
- `docs/release-checklist.md` — written directly
- `.env.example` — written directly; no real values committed
- `vercel.json` — written directly
- `.github/pull_request_template.md` — written directly
- `.github/ISSUE_TEMPLATE/` — written directly

### Remaining Open Questions

- Production URL pending Vercel deployment — to be filled in `docs/release-checklist.md`
- Mohamed (UI/Barakat) frontend integration against real API is pending
- PR merge evidence for all members pending confirmation on GitHub

