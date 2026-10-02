# ModelOps — Team 11

A small, authenticated ML-governance workspace for recording experiment evidence, comparing saved evaluations and making human review decisions. It does not train models, execute submitted test names or certify safety.

## Current workflow

Sign in → select/create an organization → edit intake at `/evaluations/new` → save an immutable evaluation → review its evidence and workflow → compare authorized saved IDs → export the dossier.

The server validates input, computes the evidence rubric and persists the result atomically. Optional AI selects guidance from a small approved catalogue; it cannot supply model facts, scores or approval. Missing or invalid AI output leaves deterministic evaluation available.

## Stack and setup

The committed manifest/lockfile are authoritative: Next.js 16.3.8, React 19, TypeScript, Zod, Tailwind, Supabase Auth/PostgreSQL, optional Groq/Gemini, Sentry, Vitest and Playwright. Node 22 is required (`.nvmrc`); package manager: npm 10.9.0. The handbook audit found no framework patch-version pin.

From the directory containing `package.json`, in PowerShell:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Edit `.env.local` before starting: set the matching Supabase URL, publishable key, server-only secret and local app URL. Apply the committed migrations in filename order to your own development database. Authentication redirect URLs must match that environment. Do not use the production database for integration fixtures.

AI keys are optional. Keep `AI_EGRESS_MODE=disabled` until provider/data review is complete. Enabling `non_sensitive_only` additionally requires each input to explicitly declare public, non-sensitive data. Public Supabase keys and Sentry ingest DSNs are not server secrets; Supabase secret, AI credentials and source-map upload token must never use `NEXT_PUBLIC_`.

## Routes

| Page | Purpose |
|---|---|
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Authentication |
| `/onboarding`, `/select-organization`, `/invite/accept` | Membership and initial workspace |
| `/dashboard` | Tenant-scoped summary and activity |
| `/evaluations`, `/evaluations/new`, `/evaluations/[id]` | Catalog, editable intake and immutable saved record |
| `/compare`, `/reviews`, `/settings/members` | Authorized comparison, reviewer queue and administration |
| `/modelops` | Existing compatibility workspace |

Page visibility does not replace API authorization or database checks.

## Validation

```powershell
npm run lint
npx tsc --noEmit
npm test
npm run test:evaluation
npx playwright install chromium
npm run test:review-queue
npm run test:browser-auth
npm run test:catalog
npm run test:production-smoke
npm run build
npm audit --omit=dev --audit-level=high
npm audit --audit-level=moderate
```

The ten-case report is generated under `test-results/`, not guessed from a checklist. Local tests skip the opt-in live integration suite. `tests/e2e/workflow.test.ts` tests service flow, not a real browser. Run the guarded PowerShell integration/browser/performance runners against a separate disposable Supabase project for live proof; they prompt for secrets without committing them.

## Documentation

- [Architecture](docs/architecture.md), [API contracts](docs/api-contracts.md)
- [Readiness rubric](docs/readiness-checklist.md), [model-card/editor scope](docs/model-card-template.md)
- [Approved sources](docs/source-register.md), [AI use](docs/ai-usage.md)
- [Limitations](docs/known-gaps-and-limitations.md), [security checks](docs/security-checklist.md)
- [Release gates](docs/release-checklist.md), [demo](docs/DEMO_SCRIPT.md)
- [Closure plan](docs/handbook-closure-plan.md), [verification record](docs/handbook-closure-results.md)
- [Contribution evidence](docs/contribution-matrix.md)

Older audits, session logs and feature proposals in `docs/` are historical, not current release proof. No high score is a deployment approval.

## Recorded team roster

Ahmed Amir Rusrus — integration/architecture; Haneen Magdy — AI/backend; Mohamed Said Mohamed Barakat — UI/workflow; Zein ElDin Mohamed Farouk — knowledge/tools/quality. Reviewed PR ownership and individual AI-use confirmation remain separate final evidence, not inferred from this roster.
