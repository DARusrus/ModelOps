# ModelOps — Contribution Matrix

> **Owner:** Ahmed Amir Rusrus — Integration Lead / Solution Architect
> **Required for:** Final submission checklist item S-13
> **Last updated:** Session 5

This matrix documents the specific code, tests, documents, and evidence owned
by every member. Every row is traceable to a real file in the repository.

---

## Ahmed Amir Rusrus — Integration Lead / Solution Architect

| Artifact | Type | Description |
|----------|------|-------------|
| `README.md` | Documentation | Problem, users, features, setup instructions, environment template |
| `docs/architecture.md` | Documentation | System architecture, module ownership, data-flow diagram, file structure |
| `docs/api-contracts.md` | Documentation | Full request/response shapes for both API routes |
| `docs/release-checklist.md` | Documentation | Production gate checklist, smoke tests, rollback plan |
| `docs/security-checklist.md` | Documentation | Server secrets, injection policy, safe tool boundaries |
| `docs/contribution-matrix.md` | Documentation | This file — member accountability matrix |
| `.env.example` | Configuration | Variable names only — no real values |
| `vercel.json` | Configuration | Vercel production configuration |
| `.github/pull_request_template.md` | Process | PR review checklist enforced on every merge |
| `.github/ISSUE_TEMPLATE/` | Process | Per-role GitHub issue templates |
| `.github/workflows/ci.yml` | CI/CD | GitHub Actions: lint → TypeScript check → tests → build |
| `tests/e2e/workflow.test.ts` | Tests | End-to-end workflow tests covering main path, failure cases, compare endpoint |
| `scripts/smoke-test.sh` | Scripts | curl-based smoke test against live production URL |

---

## Moamen Elkholy — AI & Backend Engineer

| Artifact | Type | Description |
|----------|------|-------------|
| `src/app/api/modelops/route.ts` | API | POST `/api/modelops` — validation → AI → readiness score → response |
| `src/app/api/modelops/compare/route.ts` | API | POST `/api/modelops/compare` — two-run deterministic diff |
| `src/lib/ai/groq.ts` | Backend | Primary provider (Groq `llama-3.3-70b-versatile`) |
| `src/lib/ai/gemini.ts` | Backend | Fallback provider (Gemini `gemini-1.5-flash`) with structured output |
| `src/lib/ai/prompts.ts` | Backend | `buildModelCardPrompt()` — anti-hallucination prompt builder |
| `src/lib/ai/providers.ts` | Backend | `generateWithFallback()` — provider orchestration with offline fallback |
| `src/lib/ai/validators.ts` | Backend | `parseAndValidateAIResponse()` — Zod enforcement on AI output |
| `src/lib/modelops/schema.ts` | Schema | `ModelCardOutputSchema` — source-of-truth Zod schema |
| `src/lib/modelops/service.ts` | Backend | `processModelOpsRequest()` — pipeline orchestrator + LRU cache |
| `src/lib/modelops/validators.ts` | Backend | `validateInput()` + `ExperimentMetadataSchema` — input validation |
| `src/lib/modelops/lru.ts` | Utility | `LRUCache<K,V>` — generic LRU cache |
| `docs/ai-usage.md` | Documentation | AI provider strategy, prompt engineering, output validation, traceability |
| `tests/api/modelops.test.ts` | Tests | Unit tests: `validateInput`, `processModelOpsRequest`, cache behaviour |
| `tests/api/compare.test.ts` | Tests | Unit tests: POST `/api/modelops/compare` — valid, missing fields, invalid JSON |

---

## Mohamed Said Mohamed Barakat — Product UI & Workflow Engineer

| Artifact | Type | Description |
|----------|------|-------------|
| `src/app/modelops/page.tsx` | UI | Main workflow page |
| `src/components/modelops/InputForm.tsx` | UI | Experiment intake form — all required fields |
| `src/components/modelops/ResultView.tsx` | UI | Model card render — structured output display |
| `src/components/modelops/EvidencePanel.tsx` | UI | Gaps, sources, evidence display |
| `src/components/modelops/RunComparison.tsx` | UI | Side-by-side run comparison |
| `src/components/common/LoadingState.tsx` | UI | Shared loading state component |
| `src/components/common/ErrorState.tsx` | UI | Shared error state component |

> **Status:** In progress (Session 5). Backend integration is pending UI completion.

---

## Zein ElDin Mohamed Farouk — Knowledge, Tools & Quality Engineer

| Artifact | Type | Description |
|----------|------|-------------|
| `src/lib/modelops/tools.ts` | Tools | `readiness_score()` + `compare_runs()` — pure deterministic functions |
| `src/lib/modelops/tool-rules.ts` | Tools | Scoring rules documentation + `KNOWN_QUALITY_FINDINGS` |
| `src/lib/modelops/taxonomy.ts` | Knowledge | Domain taxonomy — risk severity levels, metric categories |
| `src/lib/corpus/` | Knowledge | Approved knowledge corpus files |
| `docs/source-register.md` | Documentation | Approved trusted sources with URL, access date, intended use |
| `docs/model-card-template.md` | Documentation | Required model card structure |
| `docs/readiness-checklist.md` | Documentation | Human-readable scoring rubric |
| `docs/known-gaps-and-limitations.md` | Documentation | Honest account of coverage gaps and prohibited use cases |
| `tests/tools/` | Tests | Unit tests for `readiness_score()` and `compare_runs()` |
| `tests/evaluation/` | Tests | 10-case evaluation matrix |
| `tests/fixtures/modelops/` | Fixtures | Five sample experiment records |

---

## Integration Evidence

| Evidence type | Location |
|---------------|----------|
| PR / merge history | GitHub → Pull Requests tab on `dev` and `main` |
| CI pass log | GitHub → Actions → CI workflow runs |
| Architecture diagram | `docs/architecture.md` §2 (Mermaid) |
| API contracts | `docs/api-contracts.md` |
| Release gate | `docs/release-checklist.md` |
| Production URL | To be filled after Vercel deployment |
