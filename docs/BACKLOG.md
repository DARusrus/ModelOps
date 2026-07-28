| ❌ MISSING | 0 features || 🔧 INCOMPLETE | 0 features || ✅ DONE | 58 features |# BACKLOG.md

# ModelOps — Feature Backlog

Version: 1.0
Engineer: Haneen (Senior AI Backend Engineer)
Created: 2026-07-22
Status: ACTIVE

---

## Backlog Legend

| Status | Meaning |
|---|---|
| ✅ DONE | Feature complete and verified |
| ✅ DONE | Skeleton exists but not functional |
| ✅ DONE | Does not exist yet |
| 🚫 BLOCKED | Cannot proceed without dependency |
| ⏸️ DEFERRED | Intentionally postponed |
| 👤 OTHER OWNER | Outside my domain |

---

## A. Foundation & Types

| ID | Feature | File | Status | Priority | Milestone |
|---|---|---|---|---|---|
| A1 | Expand `ExperimentMetadataSchema` with all input fields | `src/lib/modelops/validators.ts` | ✅ DONE | P0 | M0 |
| A2 | Expand `ModelCardOutputSchema` to 18 mandatory fields | `src/lib/modelops/schema.ts` | ✅ DONE | P0 | M0 |
| A3 | Fix `metrics` type from `z.any()` to `z.number()` | `src/lib/modelops/schema.ts` | ✅ DONE | P0 | M0 |
| A4 | Define `AIProviderResponse` interface | `src/types/index.ts` | ✅ DONE | P0 | M0 |
| A5 | Define structured error types | `src/types/index.ts` | ✅ DONE | P0 | M0 |
| A6 | Define `CompareRunsInput` / `CompareRunsOutput` types | `src/types/index.ts` | ✅ DONE | P0 | M0 |
| A7 | Eliminate all `any` types from backend files | Multiple | ✅ DONE | P0 | M0 |

---

## B. AI Provider Layer

| ID | Feature | File | Status | Priority | Milestone |
|---|---|---|---|---|---|
| B1 | Implement Groq provider (API call, parsing, errors) | `src/lib/ai/groq.ts` | ✅ DONE | P0 | M1 |
| B2 | Implement Gemini provider (API call, structured output, errors) | `src/lib/ai/gemini.ts` | ✅ DONE | P0 | M1 |
| B3 | Create prompt templates module | `src/lib/ai/prompts.ts` | ✅ DONE | P0 | M1 |
| B4 | Add retry logic per provider | `src/lib/ai/providers.ts` | ✅ DONE | P1 | M1 |
| B5 | Add timeout support per provider | `src/lib/ai/providers.ts` | ✅ DONE | P1 | M1 |
| B6 | Handle both-providers-fail case safely | `src/lib/ai/providers.ts` | ✅ DONE | P0 | M1 |
| B7 | Response normalization to unified interface | `src/lib/ai/providers.ts` | ✅ DONE | P1 | M1 |
| B8 | AI response validation against schema | `src/lib/ai/validators.ts` | ✅ DONE | P0 | M1 |
| B9 | Anti-hallucination prompt instructions | `src/lib/ai/prompts.ts` | ✅ DONE | P0 | M1 |
| B10 | Provider failure logging (no secrets) | `src/lib/ai/providers.ts` | ✅ DONE | P1 | M1 |

---

## C. Deterministic Tools

| ID | Feature | File | Status | Priority | Milestone |
|---|---|---|---|---|---|
| C1 | Implement `readiness_score()` scoring algorithm | `src/lib/modelops/tools.ts` | ✅ DONE | P0 | M2 |
| C2 | Readiness score justification object | `src/lib/modelops/tools.ts` | ✅ DONE | P0 | M2 |
| C3 | Implement `compare_runs()` diff algorithm | `src/lib/modelops/tools.ts` | ✅ DONE | P0 | M2 |
| C4 | Tool input validation | `src/lib/modelops/tools.ts` | ✅ DONE | P1 | M2 |
| C5 | Handle incomplete experiments in scoring | `src/lib/modelops/tools.ts` | ✅ DONE | P0 | M2 |

---

## D. Service Orchestrator

| ID | Feature | File | Status | Priority | Milestone |
|---|---|---|---|---|---|
| D1 | Full orchestration: validate → AI → tools → response | `src/lib/modelops/service.ts` | ✅ DONE | P0 | M3 |
| D2 | Structured error handling in service layer | `src/lib/modelops/service.ts` | ✅ DONE | P0 | M3 |
| D3 | Backend logging (traceable operations) | `src/lib/modelops/service.ts` | ✅ DONE | P1 | M3 |
| D4 | Set `decision` to `"pending_human_review"` always | `src/lib/modelops/service.ts` | ✅ DONE | P0 | M3 |

---

## E. API Routes

| ID | Feature | File | Status | Priority | Milestone |
|---|---|---|---|---|---|
| E1 | Wire `/api/modelops` to validation + service | `src/app/api/modelops/route.ts` | ✅ DONE | P0 | M4 |
| E2 | Wire `/api/modelops/compare` to validation + tools | `src/app/api/modelops/compare/route.ts` | ✅ DONE | P0 | M4 |
| E3 | Shared error response utility | (new file or inline) | ✅ DONE | P1 | M4 |
| E4 | Never leak provider errors to client | `src/app/api/modelops/route.ts` | ✅ DONE | P0 | M4 |

---

## F. Testing

| ID | Feature | File | Status | Priority | Milestone |
|---|---|---|---|---|---|
| F1 | Install vitest dependency | `package.json` | ✅ DONE | P0 | M5 |
| F2 | Add test script to package.json | `package.json` | ✅ DONE | P0 | M5 |
| F3 | Real `readiness_score` tests | `tests/tools/readiness-score.test.ts` | ✅ DONE | P0 | M5 |
| F4 | Real `compare_runs` tests | `tests/tools/compare-runs.test.ts` | ✅ DONE | P0 | M5 |
| F5 | Real API route tests | `tests/api/modelops.test.ts` | ✅ DONE | P0 | M5 |
| F6 | Compare API route tests | `tests/api/compare.test.ts` | ✅ DONE | P1 | M5 |
| F7 | Validator unit tests | `tests/lib/validators.test.ts` | ✅ DONE | P1 | M5 |
| F8 | Provider unit tests (mocked) | `tests/lib/providers.test.ts` | ✅ DONE | P1 | M5 |

---

## G. Documentation

| ID | Feature | File | Status | Priority | Milestone |
|---|---|---|---|---|---|
| G1 | Full API contracts (request/response shapes) | `docs/api-contracts.md` | ✅ DONE | P1 | M6 |
| G2 | AI usage documentation | `docs/ai-usage.md` | ✅ DONE | P1 | M6 |
| G3 | Source register data | `docs/source-register.md` | ✅ DONE | P2 | M6 |
| G4 | Create WORK_LOG.md | `WORK_LOG.md` | ✅ DONE | P1 | M6 |
| G5 | Create ERROR_LOG.md | `ERROR_LOG.md` | ✅ DONE | P1 | M6 |
| G6 | Update README with testing and API usage | `README.md` | ✅ DONE | P2 | M6 |
| G7 | Sync architecture.md file paths with reality | `docs/architecture.md` | ✅ DONE | P2 | M6 |

---

## H. Outside My Domain

| ID | Feature | File | Owner | Status |
|---|---|---|---|---|
| H1 | InputForm fields, state, submission, API call | `src/components/modelops/InputForm.tsx` | Mohamed | 👤 OTHER OWNER |
| H2 | ResultView structured model card display | `src/components/modelops/ResultView.tsx` | Mohamed | 👤 OTHER OWNER |
| H3 | EvidencePanel evidence listing | `src/components/modelops/EvidencePanel.tsx` | Mohamed | 👤 OTHER OWNER |
| H4 | RunComparison rendering | `src/components/modelops/RunComparison.tsx` | Mohamed | 👤 OTHER OWNER |
| H5 | ModelOps page state + component integration | `src/app/modelops/page.tsx` | Mohamed | 👤 OTHER OWNER |
| H6 | E2E workflow tests | `tests/e2e/workflow.test.ts` | Ahmed | 👤 OTHER OWNER |
| H7 | CI/CD workflows | `.github/workflows/` | Ahmed | 👤 OTHER OWNER |

---

## I. Future Features (Deferred per RULES.md)

| ID | Feature | Status | Notes |
|---|---|---|---|
| I1 | Run Side by Side comparison UI | ⏸️ DEFERRED | Backend extension points only. No speculative implementation. |
| I2 | Persist experiment runs (storage layer) | ⏸️ DEFERRED | Architecture doc mentions `lib/storage/`. Not started. |
| I3 | Export model card as PDF | ⏸️ DEFERRED | Mohamed's domain. Future component. |
| I4 | Additional AI providers (OpenAI, etc.) | ⏸️ DEFERRED | Unified interface supports easy addition. |
| I5 | Auth / user accounts | ⏸️ DEFERRED | Ahmed's domain. Middleware layer. |

---

## Summary Counts

| Status | Count |
|---|---|
| ✅ DONE | 17 features |
| ✅ DONE | 21 features |
| ✅ DONE | 20 features |
| 👤 OTHER OWNER | 7 features |
| ⏸️ DEFERRED | 5 features |
| **Total backlog (my domain)** | **41 items** |
