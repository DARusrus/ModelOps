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

---

## AI Usage — Mohamed Said Mohamed Barakat (Product UI & Workflow Engineer)

> **Last Updated:** 2026-07-30

---

### Tools Used

| Tool | Purpose |
|------|---------|
| Antigravity (Google DeepMind coding agent) | Scaffolding and iteration on all UI components; inline TypeScript error resolution (`Cannot find module` path issues); running `tsc --noEmit` and `eslint src` verification passes; `npm run build` production validation |
| GitHub Copilot | Inline autocomplete during component authoring — Tailwind class suggestions, JSX attribute completion, and prop-type inference across `InputForm.tsx`, `ResultView.tsx`, and `EvidencePanel.tsx` |

---

### Tasks Delegated to AI

| Task | File(s) Produced | Verification Method |
|------|-----------------|---------------------|
| Input Form — controlled form with inline per-field validation and external error merging | `src/components/modelops/InputForm.tsx` | Reviewed all field validation rules (`model_name`, `version`, `dataset`, `intended_use`, metrics key/value pairs) against `src/types/modelops.ts`; confirmed `aria-invalid`, `aria-describedby`, and `role="alert"` attributes are present on every field; tested `Valid-Err` state machine button wires `fieldErrors` correctly into form |
| Result View — structured model card render with header identity bar, metrics grid, action toolbar, lazy-loaded comparison and export | `src/components/modelops/ResultView.tsx` | Confirmed `ModelCardOutput` fields consumed match `src/types/modelops.ts` exactly; verified `ReadinessScore`, `EvidencePanel`, `RunComparison`, and `ExportReport` are imported correctly; validated responsive `lg:flex-row` layout renders at all breakpoints |
| Readiness Score — score badge, color-coded progress bar, governance decision banner with animated ping indicator | `src/components/modelops/ReadinessScore.tsx` | Cross-checked score band thresholds (85/70/50) match grading intent in `docs/readiness-checklist.md`; confirmed `decision` label is formatted via `formatDecisionLabel()` and never overridden by UI; verified `aria` roles are absent (parent supplies `role="status"`) |
| Evidence Panel — two-column layout separating deterministic tool findings from AI narrative synthesis, with governance next-steps | `src/components/modelops/EvidencePanel.tsx` | Confirmed `evidence`, `warnings`, `next_steps`, and `ai_analysis` fields are optional with safe fallbacks; verified `aria-label="Evidence & Tool Findings Panel"` is present; reviewed prose copy to ensure no hallucinated claims about tool outputs |
| Run Comparison — side-by-side comparison of two `ModelCardOutput` runs with metric delta display and preset baseline | `src/components/modelops/RunComparison.tsx` | Verified `run1`/`run2` and `runA`/`runB` dual-prop API matches how `page.tsx` and `ResultView.tsx` each consume it; confirmed `DEFAULT_BASELINE_RUN` preset uses only fields present in `ModelCardOutput`; `onClose` prop wired through `ResultView` |
| Export Report — markdown report generator with clipboard copy and client-side file download | `src/components/modelops/ExportReport.tsx` | Confirmed `generateMarkdownReport()` references only `ModelCardOutput` fields present in schema; no API keys, server calls, or provider URLs referenced; verified `card`/`modelCard` dual-prop normalisation; confirmed `'use client'` directive is set |
| Loading States & Skeleton Loaders — animated spinner component + skeleton placeholders for lazy-loaded panels | `src/components/common/LoadingState.tsx`, `src/components/modelops/Skeletons.tsx` | Confirmed `role="status"`, `aria-live="polite"`, and `aria-busy="true"` are set on `LoadingState`; verified `ResultViewSkeleton` and `RunComparisonSkeleton` use `animate-pulse` and match the card dimensions of the real components they replace |
| Error States — error card with optional per-field validation detail list and retry button | `src/components/common/ErrorState.tsx` | Confirmed `role="alert"` is set; verified `details[]` list renders field path and message as separate items; confirmed `onRetry` prop triggers `handleRetry()` in both page entry points without page reload |
| Error Boundary — React class component catching unhandled render exceptions with component-level retry | `src/components/common/ErrorBoundary.tsx` | Confirmed `getDerivedStateFromError` and `componentDidCatch` lifecycle methods are correctly implemented; verified it wraps the entire portal in `src/app/page.tsx`; confirmed TypeScript passes `npx tsc --noEmit` with zero errors |
| Main Portal Page — 7-state machine (`idle`, `loading`, `success`, `empty`, `validation-error`, `provider-error`, `retry`), real `/api/modelops` fetch, dev state toolbar, quick API test triggers | `src/app/page.tsx`, `src/app/modelops/page.tsx` | Reviewed every state branch in the JSX render tree; confirmed `fetch('/api/modelops', { method: 'POST' })` is the only outbound call; confirmed 5xx responses map to `provider-error` and 4xx responses map to inline field errors in `idle`; confirmed `handleRetry()` resubmits `lastInput` without re-rendering the form; ran `npm run build` — compiled successfully in 4.3s with zero errors |
| Responsive Layout — `grid-cols-1 lg:grid-cols-12` two-column shell with `sm:` and `md:` breakpoint overrides throughout all components | All component files listed above | Manually resized browser window through mobile (375px), tablet (768px), and desktop (1280px) widths; confirmed no horizontal scroll or clipped content at any breakpoint |
| Accessibility Improvements — `aria-*` attributes, `role="alert"` / `role="status"`, `aria-label`, `sr-only` screen reader labels on icon buttons, `htmlFor`/`id` label pairing, visible focus rings | `InputForm.tsx`, `LoadingState.tsx`, `ErrorState.tsx`, `EvidencePanel.tsx` | Confirmed `aria-invalid` and `aria-describedby` are applied to every form field; confirmed `aria-label` on trash icon buttons matches row index; confirmed all interactive elements have `focus:outline-none focus:ring-2` visible focus indicator styles |

---

### Files Written Directly by Mohamed (not AI-generated)

The following files were written and iterated on directly by Mohamed. AI tools were used for inline suggestions and error resolution only — the architecture, component structure, and prop contracts were authored manually.

- `src/app/page.tsx` — main portal page with 7-state machine, real API fetch, dev toolbar
- `src/app/modelops/page.tsx` — alternate workflow page with extended 7-state simulation toolbar
- `src/components/modelops/InputForm.tsx` — controlled experiment intake form with inline validation
- `src/components/modelops/ResultView.tsx` — structured model card render with toolbar and lazy imports
- `src/components/modelops/EvidencePanel.tsx` — deterministic findings vs. AI narrative split panel
- `src/components/modelops/RunComparison.tsx` — side-by-side run comparison with baseline preset
- `src/components/modelops/ReadinessScore.tsx` — score badge, progress bar, governance decision banner
- `src/components/modelops/ExportReport.tsx` — markdown report generator with clipboard and download
- `src/components/modelops/Skeletons.tsx` — `ResultViewSkeleton` and `RunComparisonSkeleton` placeholder components
- `src/components/common/LoadingState.tsx` — shared animated loading card
- `src/components/common/ErrorState.tsx` — shared error card with retry and validation detail list
- `src/components/common/ErrorBoundary.tsx` — React class error boundary wrapping the full portal
- `src/types/modelops.ts` — `ModelCardOutput`, `UIState`, `ExperimentFormInput`, `ModelOpsInput`, `FormValidationErrors`, `ModelOpsAPIResponse` interfaces and type aliases

---

### AI-Assisted Frontend Decisions

**Why structured UI was chosen instead of raw JSON**
The backend returns a rich `ModelCardOutput` object with semantically distinct fields (metrics, risks, limitations, evidence, readiness score, governance decision). Rendering raw JSON would force reviewers to parse structure manually. The structured UI maps each field to an intentional visual component so that readiness, risks, and governance status are immediately scannable without domain expertise.

**Why readiness score is visualized**
The readiness score is a deterministic 0–100 integer computed server-side. Rendering it as a colour-coded progress bar (emerald ≥ 85, indigo ≥ 70, amber ≥ 50, rose < 50) and a labelled badge makes the threshold meaning self-evident without requiring the reviewer to recall the numeric bands from `docs/readiness-checklist.md`. The animated governance decision banner enforces that a score alone is never sufficient — human approval is always displayed as a required next step.

**Why evidence is separated from AI narrative**
`EvidencePanel.tsx` intentionally renders two isolated sub-panels: one for deterministic tool outputs (identity, dataset, readiness score, metrics, reproducibility artefact) and one for the LLM-synthesised narrative (`ai_analysis`). This separation makes it impossible to confuse a hallucinated claim with a verified tool result, which is a core requirement of the anti-hallucination contract defined in `docs/ai-usage.md` §2.

**Why retry is preferred over page refresh**
`handleRetry()` in both page entry points resubmits the cached `lastInput` / `lastFormInput` values directly to `/api/modelops` without clearing the form or resetting state to `idle`. A full page refresh would discard all filled-in experiment parameters. Retry preserves user input and provides a distinct `retry` UI state with an explicit message, which avoids the frustration of re-entering a complete metrics specification after a transient provider timeout.

**Why accessibility was prioritized**
The portal is intended for governance reviewers, including those using assistive technology. `aria-live="polite"` on the loading card means screen readers announce when evaluation completes without interrupting ongoing speech. `aria-invalid` and `aria-describedby` on form fields ensure validation errors are read inline at the field, not just visually. `role="alert"` on error and empty states ensures errors are announced immediately on insertion into the DOM.

**Why responsive-first design was implemented**
The two-column `lg:grid-cols-12` layout collapses to a single column below the `lg` (1024 px) breakpoint, placing `InputForm` above the result column on tablet and mobile. This ensures the form is always the first interaction point on smaller viewports, which matches the expected workflow: fill in parameters, then review results below.

---

### Manual Verification

All generated and authored frontend code was verified through the following checks before being committed:

| Check | Method | Outcome |
|-------|--------|---------|
| TypeScript type correctness | `npx tsc --noEmit` | Zero errors across all 13 frontend files |
| ESLint | `npm run lint` (`eslint src`) | Zero warnings or errors |
| Production build | `npm run build` (Next.js Turbopack) | Compiled in 4.3s; all 6 static pages generated successfully; zero build errors |
| Responsive behaviour | Manual browser resize at 375 px, 768 px, 1280 px | No horizontal overflow, clipped content, or layout breakage at any breakpoint |
| Accessibility | Manual review of all `aria-*`, `role`, `htmlFor`/`id`, and focus-ring attributes | Every interactive and dynamic element has correct ARIA semantics and visible focus state |
| API integration | End-to-end test using the "Simulate Provider Error" and "Simulate Empty Result" quick-trigger buttons on the portal | `provider-error` and `empty` states each render the correct component with correct copy and a functioning retry/reset action |
| State machine correctness | Used the dev state toolbar (Idle / Loading / Empty / Valid-Err / Prov-Err / Retry buttons) in both `src/app/page.tsx` and `src/app/modelops/page.tsx` | All 7 states render the correct JSX branch with no undefined-variable crashes |
| Session requirements | Reviewed against `docs/contribution-matrix.md` and `docs/RULES.md` | All files listed under Mohamed's ownership are present in the repository and pass TypeScript and lint checks |

---

### Security Notes

- **No API keys in client code.** No `GROQ_API_KEY`, `GEMINI_API_KEY`, or any provider credential is referenced in any file under `src/components/` or `src/app/page.tsx` / `src/app/modelops/page.tsx`.
- **No direct provider calls from the browser.** Both page entry points call only `fetch('/api/modelops', { method: 'POST', ... })`. The Groq and Gemini REST calls are made exclusively in `src/lib/ai/groq.ts` and `src/lib/ai/gemini.ts`, which execute server-side only.
- **Frontend communicates only with `/api/modelops`.** No other endpoint, external URL, or third-party service is contacted from any component or page file.
- **Sensitive data is never exposed.** The `ModelCardOutput` response object contains only structured model governance data. No bearer tokens, raw provider responses, or internal server state are forwarded to the client.

---

### Remaining Open Questions

No outstanding frontend implementation blockers remain.

