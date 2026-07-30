# ModelOps — Security Checklist

> **Owner:** Ahmed Amir Rusrus (Lead) + Zein ElDin (Quality)
> **Required for:** Final submission checklist item S-10
> **Source references:** OWASP LLM Top 10, Next.js production checklist
> **Last updated:** 2026-07-29

---

## 1. Secret & Key Protection

| Check | Implementation | Status |
|-------|---------------|--------|
| No API keys committed to the repository | `.gitignore` excludes `.env`, `.env.local`, `.env.production`; `.env.example` contains only variable names with no values | ✅ |
| `GROQ_API_KEY` is server-only | Read exclusively in `src/lib/ai/groq.ts` via `src/lib/env.ts` — no `NEXT_PUBLIC_` prefix | ✅ |
| `GEMINI_API_KEY` is server-only | Read exclusively in `src/lib/ai/gemini.ts` via `src/lib/env.ts` — no `NEXT_PUBLIC_` prefix | ✅ |
| Keys not logged or returned to the client | `src/lib/logger.ts` explicitly omits secrets from log output; API responses contain only `ModelCardOutput` fields | ✅ |
| Env vars validated at startup | `src/lib/env.ts` uses Zod `safeParse` — throws on missing keys in production, warns safely in test mode | ✅ |
| Production env vars set in Vercel dashboard only | To be confirmed after deployment — not in repo | ⬜ |

---

## 2. Server-Only Input Validation

| Check | Implementation | Status |
|-------|---------------|--------|
| All user input validated before any AI call | `src/lib/modelops/validators.ts` — `ExperimentMetadataSchema` (Zod) runs before `processModelOpsRequest()` | ✅ |
| Field length limits enforced | `MAX_STRING_LENGTH = 2000`, `MAX_SHORT_STRING = 200` in `validators.ts` | ✅ |
| Invalid JSON returns 400 (not 500) | Both route handlers (`route.ts`, `compare/route.ts`) catch JSON parse errors and return `{ success: false, error: "Invalid JSON payload" }` | ✅ |
| Malformed schema returns 400 with details | Zod `safeParse` errors mapped to `{ success: false, error: "Input validation failed", details: [...] }` | ✅ |
| Rate limiting is in place | `src/lib/rate-limit.ts` — token bucket, 20 requests / 60 seconds per IP | ✅ |
| Inputs over array limits are rejected | `data_types.max(50)`, `tests.max(50)`, `limitations.max(50)` etc. in schema | ✅ |

---

## 3. Safe AI Boundaries (OWASP LLM01 — Prompt Injection)

| Check | Implementation | Status |
|-------|---------------|--------|
| AI prompt is constructed server-side only | `src/lib/ai/prompts.ts` — `buildModelCardPrompt()` runs in the route handler; no client data is injected raw into prompts | ✅ |
| Anti-hallucination rules enforced in prompt | Prompt explicitly instructs the model to use only submitted evidence, list gaps as limitations, and produce no invented metrics | ✅ |
| `readiness_score` is deterministic — AI cannot set it | `src/lib/modelops/tools.ts` — `readiness_score()` is a pure function; the AI output is stripped of any `readiness_score` field before the deterministic value is applied in `service.ts` | ✅ |
| `decision` is hardcoded to `"pending_human_review"` | `service.ts` line 65 — set after AI response, not read from AI output | ✅ |
| Prompt injection test cases required | 10-case evaluation matrix must include at least 2 injection attempts (owned by Zein) | ⬜ |
| AI response validated with Zod before use | `src/lib/ai/validators.ts` — `parseAndValidateAIResponse()` strips markdown, parses JSON, enforces `ModelCardOutputSchema` | ✅ |

---

## 4. Safe Tool / Function Boundaries

| Check | Implementation | Status |
|-------|---------------|--------|
| `readiness_score()` takes only validated data | Pure function in `tools.ts` — no external calls, no side effects, no AI input | ✅ |
| `compare_runs()` takes only validated data | Pure function in `tools.ts` — Zod-validated `CompareRunInputSchema` runs before `compare_runs()` is invoked | ✅ |
| No tool executes autonomously without user submission | Every tool call is triggered by an explicit POST request from the user — no background automation | ✅ |
| Tool arguments are validated before execution | `CompareRequestSchema` in `validators.ts` validates both `run1` and `run2` before `compare_runs()` is called | ✅ |

---

## 5. Safe Error Handling (no sensitive data in responses)

| Check | Implementation | Status |
|-------|---------------|--------|
| All errors return structured JSON — no raw stack traces to client | `src/lib/errors.ts` + `createErrorResponse()` in `validators.ts` — all error paths use the same format | ✅ |
| Provider errors do not expose API keys or internal details | Groq/Gemini errors are caught in `providers.ts`; only a safe message is logged and the fallback path is triggered | ✅ |
| 500 errors return a generic safe message | Route handlers catch unexpected errors and return `{ success: false, error: "Internal server error" }` | ✅ |

---

## 6. Adversarial Test Evidence Required

These must be completed before the final submission (owned by Zein — Knowledge/Quality):

| Test case | What to verify |
|-----------|---------------|
| Prompt injection attempt via `intended_use` field | AI response does not follow injected instruction; output is still `ModelCardOutput`-compliant |
| Prompt injection attempt via `limitations` array | Same as above |
| Oversized payload (field > 2000 chars) | Returns 400, not 500 |
| Missing required fields (`model_name`, `dataset`, `intended_use`) | Returns 400 with `details` array listing each failed field |
| Both providers unavailable (wrong keys) | Deterministic offline fallback produces a valid `ModelCardOutput` |

---

## 7. Pre-deployment Security Gate (Ahmed — before Vercel push)

```
[ ] Confirm no real secrets exist in any committed file:
    git log --all --full-history -- '**/.env*'
    git grep -r 'GROQ_API_KEY=' -- ':!.env.example'
    git grep -r 'GEMINI_API_KEY=' -- ':!.env.example'

[ ] Confirm NEXT_PUBLIC_ prefix is not used on any secret variable:
    grep -r 'NEXT_PUBLIC_GROQ' src/
    grep -r 'NEXT_PUBLIC_GEMINI' src/

[ ] Confirm production env vars are set in Vercel dashboard only

[ ] Run full test suite: npm test
[ ] Run production build: npm run build
[ ] Deploy and verify no key is visible in browser DevTools → Network tab
```
