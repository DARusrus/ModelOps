# TODO.md

# ModelOps — Task List

Version: 1.1
Engineer: Haneen (Senior AI Backend Engineer)
Last Updated: 2026-07-22

---

## Legend

- `[ ]` — Not started
- `[/]` — In progress
- `[x]` — Completed
- `[!]` — Blocked

---

## Milestone 0 — Foundation: Types, Schemas & Shared Interfaces

- [x] Expand `ExperimentMetadataSchema` in `src/lib/modelops/validators.ts`
  - [x] Add `model_name: z.string().min(1)`
  - [x] Add `version: z.string().min(1)`
  - [x] Add `dataset: z.string().min(1)`
  - [x] Add `metrics: z.record(z.string(), z.number())`
  - [x] Add `intended_use: z.string().min(1)`
  - [x] Add `framework: z.string().optional()`
  - [x] Add `task_type: z.string().optional()`
  - [x] Add `input_shape: z.string().optional()`
  - [x] Add `data_types: z.array(z.string()).optional()`
  - [x] Add `hyperparameters: z.record(z.string(), z.unknown()).optional()`
  - [x] Preserve existing `validateInput()` function signature
- [x] Expand `ModelCardOutputSchema` in `src/lib/modelops/schema.ts`
  - [x] Fix `metrics` from `z.record(z.any())` to `z.record(z.string(), z.number())`
  - [x] Add `experiment_info: z.string()`
  - [x] Add `input_shape: z.string()`
  - [x] Add `data_types: z.array(z.string())`
  - [x] Add `distribution_summary: z.string()`
  - [x] Add `warnings: z.array(z.string())`
  - [x] Add `ai_analysis: z.string()`
  - [x] Add `detected_issues: z.array(z.string())`
  - [x] Add `error_reasons: z.array(z.string())`
  - [x] Add `suggested_fixes: z.array(z.string())`
  - [x] Add `next_steps: z.array(z.string())`
  - [x] Add `references: z.array(z.string())`
  - [x] Add `evidence: z.array(z.string())`
- [x] Define shared interfaces in `src/types/index.ts`
  - [x] `AIProviderResponse` interface
  - [x] `AIProviderError` interface
  - [x] `ServiceError` type with error codes
  - [x] `CompareRunsInput` interface
  - [x] `CompareRunsOutput` interface
  - [x] `ReadinessScoreResult` interface (score + justification)
  - [x] `APIErrorResponse` interface
- [x] Eliminate `any` types from all backend files
  - [x] `tools.ts` — replace `any` params with proper types
  - [x] `service.ts` — replace `any` param with `ExperimentMetadata`

---

## Milestone 1 — AI Provider Layer

- [x] Create `src/lib/ai/prompts.ts`
  - [x] `buildModelCardPrompt(metadata)` — generate prompt from experiment data
  - [x] Include anti-hallucination instructions
  - [x] Request structured JSON output matching schema
  - [x] Provider-independent format (plain text prompt)
- [x] Implement Groq provider in `src/lib/ai/groq.ts`
  - [x] Read `GROQ_API_KEY` from `process.env`
  - [x] POST to Groq chat completions API
  - [x] Parse JSON response from AI output
  - [x] Add timeout (configurable, default 30s)
  - [x] Throw typed error on failure (never silent)
  - [x] Return normalized `AIProviderResponse`
- [x] Implement Gemini provider in `src/lib/ai/gemini.ts`
  - [x] Read `GEMINI_API_KEY` from `process.env`
  - [x] POST to Gemini generateContent API
  - [x] Use structured output / JSON mode
  - [x] Parse response
  - [x] Add timeout (configurable, default 30s)
  - [x] Throw typed error on failure
  - [x] Return normalized `AIProviderResponse`
- [x] Harden fallback in `src/lib/ai/providers.ts`
  - [x] Add retry logic / failover logging
  - [x] Log provider failures with context (no secrets)
  - [x] Handle both-fail case: return structured error/fallback, never throw raw
  - [x] Normalize responses through unified interface
- [x] Create `src/lib/ai/validators.ts`
  - [x] Validate AI JSON output against `ModelCardOutputSchema`
  - [x] Handle partial responses (fill missing optional fields)
  - [x] Reject fabricated data when source doesn't support it
  - [x] Return validated + typed `ModelCardOutput`

---

## Milestone 2 — Deterministic Tools

- [x] Implement `readiness_score()` in `src/lib/modelops/tools.ts`
  - [x] Accept typed `ModelCardOutput` (not `any`)
  - [x] Scoring criteria (weighted):
    - [x] Model name + version present (10 pts)
    - [x] Dataset & schema documented (15 pts)
    - [x] Metrics provided and non-empty (25 pts)
    - [x] Limitations & risks disclosed (25 pts)
    - [x] Tests & reproducibility documented (25 pts)
  - [x] Return `ReadinessScoreResult` with score + justification
  - [x] Handle partial data gracefully (score what exists)
  - [x] Never return hardcoded values
- [x] Implement `compare_runs()` in `src/lib/modelops/tools.ts`
  - [x] Accept two typed `ModelCardOutput` objects
  - [x] Compute metric-by-metric diff
  - [x] Classify each metric: improved / degraded / unchanged
  - [x] Compute readiness score delta
  - [x] Return typed `CompareRunsOutput`
  - [x] Handle missing metrics in one run

---

## Milestone 3 — Service Orchestrator

- [x] Implement `processModelOpsRequest()` in `src/lib/modelops/service.ts`
  - [x] Accept validated `ExperimentMetadata`
  - [x] Call `buildModelCardPrompt()` to create prompt
  - [x] Call `generateWithFallback()` to get AI draft
  - [x] Call AI response validator on the result
  - [x] Call `readiness_score()` on validated card
  - [x] Override `readiness_score` field (never trust AI for this)
  - [x] Set `decision` to `"pending_human_review"`
  - [x] Return complete `ModelCardOutput`
- [x] Structured error handling
  - [x] Catch validation errors → return typed error
  - [x] Catch AI errors → return typed error (no provider details)
  - [x] Catch tool errors → return typed error
- [x] Logging
  - [x] Log orchestration steps
  - [x] Log which provider was used
  - [x] Log errors with context
  - [x] Never log API keys or secrets

---

## Milestone 4 — API Route Wiring

- [x] Wire `POST /api/modelops` in `src/app/api/modelops/route.ts`
  - [x] Parse `request.json()`
  - [x] Validate with `validateInput()`
  - [x] On validation fail → 400 with field errors
  - [x] Call `processModelOpsRequest(validated)`
  - [x] On success → 200 with `ModelCardOutput`
  - [x] On unhandled error → 500 with safe message
  - [x] Never expose stack traces or provider details
- [x] Wire `POST /api/modelops/compare` in `src/app/api/modelops/compare/route.ts`
  - [x] Parse `request.json()`
  - [x] Validate both run objects
  - [x] Call `compare_runs(run1, run2)`
  - [x] On success → 200 with `CompareRunsOutput`
  - [x] On validation fail → 400 with error details

---

## Milestone 5 — Testing

- [x] Install vitest
  - [x] Add to `devDependencies` in `package.json`
  - [x] Add `"test": "vitest run"` script
- [x] Rewrite `tests/tools/readiness-score.test.ts`
- [x] Rewrite `tests/tools/compare-runs.test.ts`
- [x] Rewrite `tests/api/modelops.test.ts`
- [x] Execute backend tests and verify 100% pass

---

## Milestone 6 — Documentation & Tracking

- [x] Update `docs/api-contracts.md`
- [x] Update `docs/ai-usage.md`
- [x] Update `WORK_LOG.md`
- [x] Update `ERROR_LOG.md`

---

## Summary

| Milestone | Priority | Status |
|---|---|---|
| M0 — Foundation | P0 | COMPLETED |
| M1 — AI Providers | P0 | COMPLETED |
| M2 — Tools | P0 | COMPLETED |
| M3 — Service | P0 | COMPLETED |
| M4 — Routes | P0 | COMPLETED |
| M5 — Testing | P1 | COMPLETED |
| M6 — Documentation | P1 | COMPLETED |
| **Overall Backend & AI Status** | | **COMPLETED** |
