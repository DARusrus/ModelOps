# Release checklist — evidence per reviewed commit

Do not pre-check gates from an earlier session. Record commit SHA, deployment ID, environment, timestamp and results. Local working-tree evidence is in [handbook closure results](handbook-closure-results.md); it is not proof of a deployed release.

## 1. Local and CI gates

- [ ] npm ci from the committed lockfile
- [ ] npm run lint
- [ ] npx tsc --noEmit
- [ ] npm test (record actual passes and intentional live skips)
- [ ] npm run test:evaluation (ten-case report, not checklist inference)
- [ ] npm run test:review-queue (Chromium installed; controlled boundary regressions)
- [ ] npm run test:browser-auth (real Chromium; controlled Supabase auth transport)
- [ ] npm run test:catalog (real catalog/filter components; cancellation and late-response regressions)
- [ ] npm run test:production-smoke (PowerShell 7; deterministic route, redirect, JSON/header and timeout contracts)
- [ ] npm run build
- [ ] npm audit --omit=dev --audit-level=high; preserve current advisory result
- [ ] npm audit --audit-level=moderate; require the runtime and development toolchain audit to pass
- [ ] Review diff, credentials policy and source-map upload configuration

Full npm audit also includes development tooling. Do not conceal those findings or fix them with an unreviewed force upgrade.

## 2. Disposable environment gates

- [ ] Ordered migrations applied to the separate disposable database
- [ ] Guarded integration runner: RLS, expired records, atomic writes/reviews, RPC grants, invitations, final-admin safety, dashboard/queue
- [ ] Guarded browser runner: auth, onboarding, catalog/detail, workflow/export/compare, membership, mobile/navigation/tenant isolation, dashboard/reviews
- [ ] Bounded authenticated performance runner using unchanged explicit budgets
- [ ] Capture outputs/report for this exact reviewed revision; no skipped suite counted as a pass

PowerShell runners are under scripts/. They prompt for secrets. Do not run fixture creation/deletion against production.

## 3. Production verification after reviewed merge/deployment

- [ ] Matching Supabase public URL/key and server-only secret; latest required migrations
- [ ] Auth redirect/site URL configured for this deployment
- [ ] AI egress/provider/data policy confirmed; credentials server-only
- [ ] Sentry ingest verified and private source-map upload separately verified for the release
- [ ] Retention cron installed and observed; review database/backups retention
- [ ] Vercel WAF and Supabase Auth limits checked in the current dashboard
- [ ] Production smoke passes; unauthorized POST returns 401/UNAUTHENTICATED
- [ ] Expanded smoke verifies all 28 anonymous readiness/public/protected/API targets; a passing legacy three-route check is insufficient
- [ ] Vercel deployment's source commit matches the reviewed merged revision; build output alone is not deployment provenance
- [ ] Sign in and verify saved evaluation → reopen/refresh → human workflow → JSON export → authorized comparison
- [ ] Exercise dashboard/review filter/back/forward/retry and tenant switching
- [ ] Controlled load and latency measured within authorized budgets; health probe is not mutation capacity evidence

Recorded project domain: https://model-ops.vercel.app. This document does not assert its current deployed revision or health.

## 4. Final submission

- [ ] Reviewed member PRs and confirmed attribution in contribution matrix
- [ ] Each member's actual AI-tool usage recorded
- [ ] Current architecture, API, source register, five examples and ten-case report
- [ ] Live demo/failure explanation rehearsed and actually presented when required
- [ ] Final repository/release/deployment links and instructor-specific approvals

User requested member/AI-use evidence be left until the end; those boxes are deliberately pending.

## 5. Rollback

Use the hosting platform's supported previous-deployment rollback after checking database compatibility, or a reviewed git revert. Do not reset shared history or force-push as routine recovery. Database migrations need separately reviewed forward/recovery plans. Environment changes require a new deployment to bind the intended values, especially NEXT_PUBLIC values embedded at build time. After recovery rerun smoke and protected workflow; retain incident evidence.
