# IMPLEMENTATION_PLAN.md

# ModelOps — Backend & AI Implementation Plan

Version: 1.0
Engineer: Haneen (Senior AI Backend Engineer)
Created: 2026-07-22

---

## 1. Current State Assessment

The repository is a well-structured skeleton. All directory layout, module boundaries,
deployment config, and type foundations are in place. However, no module has real
implementation beyond stubs. The entire backend data flow is disconnected.

### Completed Features

| Feature | File | Status |
|---|---|---|
| Project scaffolding (Next.js 15, Tailwind, Zod, TS) | `package.json`, configs | ✅ DONE |
| Directory structure matching architecture doc | `src/` | ✅ DONE |
| Root page redirect to `/modelops` | `src/app/page.tsx` | ✅ DONE |
| Root layout with metadata | `src/app/layout.tsx` | ✅ DONE |
| Deployment configuration | `vercel.json` | ✅ DONE |
| Environment variable template | `.env.example` | ✅ DONE |
| Git ignore rules | `.gitignore` | ✅ DONE |
| Path alias `@/*` → `./src/*` | `tsconfig.json` | ✅ DONE |
| ModelCardOutput Zod schema (basic) | `src/lib/modelops/schema.ts` | ✅ DONE (needs expansion) |
| ExperimentMetadata Zod schema (minimal) | `src/lib/modelops/validators.ts` | ✅ DONE (needs expansion) |
| Provider fallback chain structure | `src/lib/ai/providers.ts` | ✅ DONE (needs implementation) |
| Tool function signatures | `src/lib/modelops/tools.ts` | ✅ DONE (needs implementation) |
| Service function signature | `src/lib/modelops/service.ts` | ✅ DONE (needs implementation) |
| API route handler skeletons | `src/app/api/modelops/` | ✅ DONE (needs wiring) |
| UI component skeletons | `src/components/` | ✅ DONE (Mohamed's domain) |
| Base type definitions | `src/types/index.ts` | ✅ DONE |
| Source register skeleton | `src/lib/corpus/source-register.ts` | ✅ DONE (needs data) |

### Incomplete Features (Backend & AI — My Domain)

| Feature | File | Status |
|---|---|---|
| Groq AI provider | `src/lib/ai/groq.ts` | ❌ Empty stub |
| Gemini AI provider | `src/lib/ai/gemini.ts` | ❌ Empty stub |
| Prompt templates | (does not exist) | ❌ Not started |
| Unified provider interface | (does not exist) | ❌ Not started |
| Provider timeout / retry / error handling | `src/lib/ai/providers.ts` | ❌ Not implemented |
| AI response validation | (does not exist) | ❌ Not started |
| Response normalization | (does not exist) | ❌ Not started |
| Service orchestrator logic | `src/lib/modelops/service.ts` | ❌ Stub only |
| API route wiring (validation → AI → tools → response) | `src/app/api/modelops/route.ts` | ❌ Echoes input |
| Compare route wiring | `src/app/api/modelops/compare/route.ts` | ❌ Echoes input |
| Full ExperimentMetadata schema | `src/lib/modelops/validators.ts` | ❌ Only 2 fields |
| Full ModelCardOutput schema (18 mandatory fields) | `src/lib/modelops/schema.ts` | ❌ Only 11 fields |
| `readiness_score()` algorithm | `src/lib/modelops/tools.ts` | ❌ Hardcoded 85 |
| `compare_runs()` algorithm | `src/lib/modelops/tools.ts` | ❌ Returns `{}` |
| Structured error handling | (not implemented) | ❌ Not started |
| Backend logging | (not implemented) | ❌ Not started |
| Unit tests (real assertions) | `tests/` | ❌ All trivial |
| Vitest dependency | `package.json` | ❌ Not installed |
| API contracts documentation | `docs/api-contracts.md` | ❌ No shapes |
| AI usage documentation | `docs/ai-usage.md` | ❌ Empty |
| WORK_LOG.md | (does not exist) | ❌ Not created |
| ERROR_LOG.md | (does not exist) | ❌ Not created |

---

## 2. Milestones

### Milestone 0 — Foundation: Types, Schemas & Shared Interfaces

> Priority: HIGHEST — everything depends on this.

**Goal:** Establish the complete type system and validation layer that all other
milestones build on.

**Work items:**

1. Expand `ExperimentMetadataSchema` in `validators.ts` to include all required
   input fields (model name, version, dataset, metrics, intended_use, framework,
   task_type, input_shape, data_types, hyperparameters).

2. Expand `ModelCardOutputSchema` in `schema.ts` to include all 18 mandatory
   fields from RULES.md (add: experiment_info, input_shape, data_types,
   distribution_summary, warnings, ai_analysis, detected_issues, error_reasons,
   suggested_fixes, next_steps, references, evidence).

3. Fix `metrics` field from `z.record(z.any())` to `z.record(z.number())` per
   architecture spec.

4. Define unified `AIProviderResponse` interface in `src/types/index.ts`.

5. Define structured error types in `src/types/index.ts`.

6. Define `CompareRunsInput` and `CompareRunsOutput` types in `src/types/index.ts`.

7. Remove all `any` types from backend files and replace with proper interfaces.

**Dependencies:** None.
**Blockers:** None.
**Estimated files modified:** `schema.ts`, `validators.ts`, `types/index.ts`.

---

### Milestone 1 — AI Provider Layer

> Priority: HIGH — blocks service orchestrator and API routes.

**Goal:** Implement the full AI provider layer with Groq (primary) and Gemini
(fallback), unified interface, prompt engineering, response validation, timeout,
retry, and failover.

**Work items:**

1. Create prompt templates module at `src/lib/ai/prompts.ts`:
   - Model card generation prompt (modular, reusable).
   - Prompt requests structured JSON output matching `ModelCardOutputSchema`.
   - Anti-hallucination instructions (never fabricate metrics/stats).
   - Provider-independent (works with both Groq and Gemini).

2. Implement Groq provider in `src/lib/ai/groq.ts`:
   - API call to Groq REST endpoint.
   - Timeout support.
   - Structured response parsing.
   - Error handling (no silent failures).

3. Implement Gemini provider in `src/lib/ai/gemini.ts`:
   - API call to Gemini REST endpoint.
   - Structured output mode.
   - Timeout support.
   - Error handling.

4. Harden `providers.ts` fallback chain:
   - Retry logic per provider (configurable).
   - Both-fail error path returns safe structured error.
   - Log provider failures (no secrets logged).
   - Response normalization to unified `AIProviderResponse`.

5. Create AI response validation in `src/lib/ai/validators.ts`:
   - Validate AI output against `ModelCardOutputSchema`.
   - Strip/reject fabricated metrics if source data doesn't support them.
   - Handle partial/malformed AI responses gracefully.

**Dependencies:** Milestone 0 (needs complete schemas and types).
**Blockers:** API keys required in `.env.local` for integration testing.
**Estimated files modified:** `groq.ts`, `gemini.ts`, `providers.ts`.
**Estimated files created:** `prompts.ts`, `src/lib/ai/validators.ts`.

---

### Milestone 2 — Deterministic Tools

> Priority: HIGH — blocks service orchestrator.

**Goal:** Implement real algorithms for `readiness_score()` and `compare_runs()`.

**Note:** Per architecture.md § 3, deterministic tools are Zein's ownership.
However, per RULES.md, as AI Backend Engineer I'm responsible for "Readiness
Assessment" and "Business Logic." I will implement these but preserve the existing
function signatures and file location. If Zein has work in progress, I will
coordinate before modifying.

**Work items:**

1. Implement `readiness_score()` in `tools.ts`:
   - Deterministic scoring algorithm (no AI).
   - Weighted checklist: metrics presence, test coverage, documentation
     completeness, reproducibility, limitation disclosure, risk disclosure.
   - Returns 0–100 score.
   - Justification object explaining each sub-score.
   - Handles incomplete experiments gracefully (partial scores).

2. Implement `compare_runs()` in `tools.ts`:
   - Deterministic comparison of two `ModelCardOutput` objects.
   - Metric-by-metric diff with direction (improved/degraded/unchanged).
   - Readiness score delta.
   - Summary of changes.
   - Returns typed `CompareRunsOutput`.

3. Add input validation for both tool functions:
   - Validate arguments before execution (per architecture.md § 8).

**Dependencies:** Milestone 0 (needs complete types).
**Blockers:** Coordinate with Zein if they have parallel work.
**Estimated files modified:** `tools.ts`.

---

### Milestone 3 — Service Orchestrator

> Priority: HIGH — connects all backend pieces.

**Goal:** Implement `processModelOpsRequest()` to orchestrate the full flow:
validate → AI draft → readiness score → typed response.

**Work items:**

1. Implement full orchestration in `service.ts`:
   - Accept validated experiment metadata.
   - Build prompt from metadata using prompt templates.
   - Call `generateWithFallback()` to get AI draft.
   - Validate AI response against schema.
   - Call `readiness_score()` on the validated card.
   - Set `decision` to `"pending_human_review"` (never auto-approved).
   - Return complete `ModelCardOutput`.

2. Add structured error handling:
   - Validation failure → return 400 with field-level errors.
   - AI failure → return 503 with safe message (no provider details leaked).
   - Tool failure → return 500 with safe message.

3. Add logging at each orchestration step:
   - Log: request received, validation result, provider used, tool execution,
     response sent.
   - Never log: API keys, raw AI prompts with sensitive data.

**Dependencies:** Milestone 0, 1, 2 (needs schemas, AI layer, tools).
**Blockers:** None beyond dependencies.
**Estimated files modified:** `service.ts`.

---

### Milestone 4 — API Route Wiring

> Priority: HIGH — makes the system callable by the frontend.

**Goal:** Wire both API routes to use validation, service, and return proper responses.

**Work items:**

1. Wire `POST /api/modelops` route:
   - Parse request body.
   - Validate with `ExperimentMetadataSchema`.
   - Call `processModelOpsRequest()`.
   - Return `ModelCardOutput` JSON on success.
   - Return structured error JSON on failure.
   - Never leak provider errors or stack traces to client.

2. Wire `POST /api/modelops/compare` route:
   - Parse request body (two run objects).
   - Validate both runs.
   - Call `compare_runs()`.
   - Return typed comparison result.

3. Implement shared error response utility:
   - Consistent error shape: `{ error: string, details?: object }`.
   - HTTP status codes: 400 (validation), 503 (AI failure), 500 (internal).

**Dependencies:** Milestone 3 (needs working service).
**Blockers:** None beyond dependencies.
**Estimated files modified:** `route.ts`, `compare/route.ts`.

---

### Milestone 5 — Testing Infrastructure

> Priority: MEDIUM — validates all previous milestones.

**Goal:** Replace all trivial tests with real assertions. Add vitest dependency.
Achieve meaningful coverage of backend logic.

**Work items:**

1. Add `vitest` to `package.json` devDependencies.

2. Add test script to `package.json`: `"test": "vitest run"`.

3. Rewrite `tests/tools/readiness-score.test.ts`:
   - Test complete data → score calculation.
   - Test partial data → graceful handling.
   - Test empty data → minimum score.
   - Test score justification structure.

4. Rewrite `tests/tools/compare-runs.test.ts`:
   - Test identical runs → no changes.
   - Test improved metrics → correct diff.
   - Test degraded metrics → correct diff.
   - Test missing fields in one run.

5. Rewrite `tests/api/modelops.test.ts`:
   - Test valid request → 200 + `ModelCardOutput` shape.
   - Test invalid request → 400 + error shape.
   - Test missing fields → 400 with field errors.

6. Add `tests/api/compare.test.ts`:
   - Test valid comparison → 200.
   - Test invalid input → 400.

7. Add `tests/lib/validators.test.ts`:
   - Test schema validation pass/fail cases.

8. Add `tests/lib/providers.test.ts` (unit with mocks):
   - Test Groq success path.
   - Test Groq failure → Gemini fallback.
   - Test both fail → safe error.

**Dependencies:** Milestone 4 (needs working routes to test).
**Blockers:** None.
**Estimated files modified:** All test files, `package.json`.
**Estimated files created:** `compare.test.ts`, `validators.test.ts`, `providers.test.ts`.

---

### Milestone 6 — Documentation & Tracking

> Priority: MEDIUM — required by RULES.md before marking anything COMPLETED.

**Work items:**

1. Update `docs/api-contracts.md`:
   - Full request/response JSON shapes for both endpoints.
   - Error response shapes.
   - Example payloads.

2. Update `docs/ai-usage.md`:
   - AI tools used, tasks delegated, prompt strategy.
   - Verification steps.

3. Update `docs/source-register.md`:
   - Actual corpus sources used.

4. Create `WORK_LOG.md` (append-only tracking).

5. Create `ERROR_LOG.md` (append-only error tracking).

6. Update `README.md`:
   - Testing instructions.
   - API usage examples.

7. Verify `docs/architecture.md` file paths match implementation.

**Dependencies:** Milestone 4 (documentation must match implementation).
**Blockers:** None.

---

## 3. Dependency Graph

```
M0 (Foundation)
 ├──► M1 (AI Providers)
 │     │
 │     ├──► M3 (Service Orchestrator)
 │     │     │
 │     │     └──► M4 (API Routes)
 │     │           │
 │     │           ├──► M5 (Testing)
 │     │           │
 │     │           └──► M6 (Documentation)
 │     │
 └──► M2 (Deterministic Tools)
       │
       └──► M3 (Service Orchestrator)
```

**Critical path:** M0 → M1 → M3 → M4 → M5/M6

**Parallelizable:** M1 (AI Providers) and M2 (Tools) can run in parallel after M0.

---

## 4. Blockers

| Blocker | Impact | Mitigation |
|---|---|---|
| API keys not in `.env.local` | Cannot integration-test AI providers | Unit test with mocks first; integration test when keys available |
| Zein's tools ownership | `readiness_score` and `compare_runs` may conflict | Coordinate before modifying; preserve function signatures |
| No test runner installed | Cannot run tests | Install vitest in M5 |

---

## 5. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Groq/Gemini API changes | Low | High | Abstract behind unified interface |
| AI returns malformed JSON | Medium | Medium | Validate every AI response with Zod |
| AI fabricates metrics | Medium | High | Anti-hallucination prompts + validation against input data |
| Schema expansion breaks frontend | Medium | Medium | Coordinate with Mohamed; make new fields optional initially |

---

## 6. Execution Priority

| Order | Milestone | Reason |
|---|---|---|
| 1st | M0 — Foundation | Everything depends on correct types |
| 2nd | M1 — AI Providers | Longest lead time, most complexity |
| 3rd | M2 — Tools | Can parallel with M1, simpler |
| 4th | M3 — Service | Connects all pieces |
| 5th | M4 — Routes | Makes system callable |
| 6th | M5 — Tests | Validates everything |
| 7th | M6 — Docs | Final gate |
