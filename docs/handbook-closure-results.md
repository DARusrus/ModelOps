# Team 11 handbook closure — verification and handoff

Date: 2026-10-02. Scope: the ten previously audited handbook gaps and the independently identified runtime dependency findings. This is a local working-tree verification record, not proof of deployment or final course completion.

## 1. Status of every point

| Point | Implementation and effect | Verification / remaining boundary |
|---|---|---|
| 1. Consistent score | Current cards use structured evidence scoring; comparison retains historical saved score/rubric. Mixed rubrics yield no readiness delta. | Tools/API/ten-case tests; no historical card rewritten |
| 2. No invented missing facts | Shared builder preserves submitted metadata and explicit unknowns; no model-type/datatype or data-split/shape substitution. UI labels submitter claims, not verified metrics. | Sparse/full parser/service and rendered evidence-panel tests |
| 3. Truthful AI status | Strict provider selection; invalid output is provider_unavailable, not success. API refunds reserved quota for fallback/deterministic results. | Invalid JSON/types/extra fields/ineligible IDs; three API quota status cases |
| 4. Source-backed guidance | Small versioned catalogue and eligibility/source checks; provider selects IDs, server renders fixed text. Sources and guidance are displayed/exported. | Parser/eligibility/injection/rendered-UI tests. Live provider behavior still requires environment proof |
| 5. Honest Markdown | Declared test names are not checked as passed; structured passed/failed/inconclusive result/date/reference are separate. Rubric/workflow and JSON authority stated. | Export generator tests; existing JSON/export API remains unchanged |
| 6. Executable ten cases | Five current synthetic examples and ten-case runner/report cover normal, missing/ambiguous, malformed, injection and provider/invalid tool-argument paths. | 10/10 case IDs executed; extra integrity test checks matrix coverage. No external data or provider used |
| 7. Batch 7 reliability | URL-authoritative review filters, abort and stale-response guards, inactive aborted pagination state, retry, exact microsecond cursors, body-aware deadlines and native browser bodyless-response handling. | Five queue and six auth/transport Chromium checks; unit/API cursor/transport/provider tests. No tenant/role/SQL policy altered |
| 8. Accurate canonical docs | Setup, current stack, routes, scoring, source/editor/AI/export/security/release/demo behavior rewritten; historical AI-use retained but marked historical. | Document-link/source/example/version checks, route inventory, lint/type/build |
| 9. Final evidence | Actual local proof saved; release checklist requires evidence per commit instead of pre-checked claims. After the logout and catalog corrections, the user supplied current 12/12 integration and 10/10 browser passes on 2 October 2026, then reported the bounded performance test passed. Its saved baseline independently confirms 265 HTTP 200 requests and all unchanged latency budgets. | **Pending:** exact-release CI/deployment, reviewed PRs, member AI use and actual demo/defense. The supplied evidence does not identify a committed SHA. Member evidence intentionally left until end |
| 10. Editor scope | User confirmed editable intake and immutable saved cards. No saved-fact revision API or new migration added. | Detail route immutable-export guard and existing creation/detail/history tests; no claim of linked revision lineage |

Technical corrections for 1–8 and the agreed scope for 10 are implemented and locally verified. Point 9 cannot honestly be sealed from local tests. The previously outstanding development-tool vulnerabilities are now patched and the full npm audit is clean.

## 2. Files changed in this closure

These are closure edits, not a claim to have authored the pre-existing dirty Batch 7 worktree.

| Files | Change and affected consumers |
|---|---|
| src/lib/modelops/card.ts (new), service.ts | One source of submitted facts for offline and AI paths; official score/status; output feeds persistence, detail, comparison and exports |
| src/lib/corpus/guidance.ts (new), source-register.ts | Approved versioned guidance, eligibility and source allowlist; no database or retrieval service |
| src/lib/ai/prompts.ts, validators.ts | Bounded guidance-selection prompt/strict parser; no arbitrary AI facts or decisions |
| src/lib/ai/groq.ts, gemini.ts | Keep attempt/parent cancellation through response-body consumption; Groq system instruction matches constrained selection |
| src/lib/modelops/tools.ts, tool-rules.ts | Recorded score/rubric comparisons and honest legacy-rule explanation; legacy fixture behavior retained |
| src/domain/modelops/api-contracts.ts, components/modelops/RunComparison.tsx | Nullable cross-rubric readiness delta, rubric labels and summary; saved-ID authorization unchanged |
| src/components/modelops/EvidencePanel.tsx | Explicit unverified dataset/test notice, truthful legacy metric label, visible guidance/source/status; existing layout retained |
| src/lib/modelops/markdown-report.ts (new), components/modelops/ExportReport.tsx | Pure truthful summary generator; copy/preview wiring, JSON/print interactions unchanged |
| src/components/reviews/ReviewQueue.tsx | Route prop authority, guarded initial/page results, abort-aware page status, retry; existing filter/links/buttons preserved |
| src/lib/modelops/pagination.ts | Validate and preserve timestamp/offset string instead of rounding through Date |
| src/lib/network/timeout.ts | Bound managed-service response body, caller abort and memory; preserves JSON/status/headers/cookies. Pass through HTTP 204/205/304 instead of constructing an invalid body; not an SSE adapter |
| tests/lib/validators.test.ts, network-timeout.test.ts, pagination.test.ts, ai-providers.test.ts | Provider schema/facts, timeout/body/cancellation/size/headers, cursor precision and provider body-deadline regressions |
| tests/tools/compare-runs.test.ts, tests/api/reviews.test.ts, modelops-create.test.ts | Saved scores/mixed rubrics, precision through trusted RPC, AI quota refund |
| tests/lib/markdown-report.test.ts (new), tests/components/evidence-panel.test.tsx (new) | Export truth and visible/escaped guidance; no invented verification claims |
| tests/evaluation/modelops-cases.json, handbook.test.ts (new), tests/fixtures/modelops/current-experiments.ts (new) | Current executable matrix and five synthetic examples; legacy JSON fixtures preserved |
| tests/architecture/project-baseline.test.ts, handbook-documents.test.ts (new) | Immutable saved-card public route; canonical links/sources/versions/examples |
| scripts/report-handbook-evaluation.mjs (new), validate-review-queue.mjs (new), validate-browser-auth.mjs (new) | Derive actual reports from executed tests; real React components and native Chromium fetch with controlled routing/HTTP. Auth checks use the real Supabase SSR client, synthetic credentials and intercepted requests only; no Supabase writes |
| package.json, package-lock.json | Next/ESLint 16.3.8; compatible brace-expansion 5.0.12 and fast-uri 3.1.8; explicit patched test-only esbuild 0.25.12, Vite 6.4.3 and Vitest 4.1.11; validation scripts |
| .github/workflows/quality.yml | Run ten-case/queue/browser-auth regressions and preserve machine-readable reports; full dependency audit rejects moderate-or-higher runtime/development findings; existing lint/type/test/build/runtime audit/SBOM gates retained |
| README.md; docs/architecture.md, api-contracts.md, readiness-checklist.md, model-card-template.md, source-register.md, known-gaps-and-limitations.md, security-checklist.md | Current canonical architecture/contracts/evidence/editor/security and known limits |
| docs/release-checklist.md, DEMO_SCRIPT.md, ai-usage.md, contribution-matrix.md | Honest pending release/member/live evidence, three-minute real-route demo, current AI policy above preserved historical log |
| docs/handbook-closure-plan.md, handbook-closure-results.md (new) | Scope, affected consumers, why/tests, user decisions and verification handoff |

No SQL, credential, authentication-role or API mutation endpoint was added for this closure. Existing Batch 7 authentication/routes/migrations/tests were preserved and included in the broad local gate.

## 3. Local verification

- Clean installation: npm ci passed with the declared npm 10.9.0 using the generated lockfile.
- Lint: passed.
- TypeScript: passed.
- Full local suite after logout correction: 277 assertions passed across 63 discovered files; 12 live-integration assertions intentionally skipped. No failed assertions in the final run. These skips are not live validation.
- Ten-case evaluation: all ten IDs passed; matrix integrity also passed.
- Real-component Chromium queue regression: five checks passed.
- Native Chromium auth/transport regression: six checks passed; real SSR auth client and sign-out component, controlled HTTP and Next navigation. This is not the full live Next/Supabase suite.
- Production build: Next.js 16.3.8 compiled every current API/page route, including dashboard/reviews.
- Playwright discovery: ten live browser flows in two files; **discovery is not execution**.
- Runtime audit: zero vulnerable runtime packages after the security patches.
- Full audit: zero reported vulnerabilities, including development dependencies, after the reviewed test-tool upgrade.
- Git diff whitespace check: passed after removing the extra document EOF blank line.

Reports generated in ignored test-results/: handbook-local-suite.json, handbook-evaluation.json, handbook-evaluation-report.json/.md, review-queue-regression.json, browser-auth-regression.json. Quality CI now preserves the relevant ten-case/queue/auth reports as artifacts. Read per-assertion status for suite totals: the old Vitest 1 reporter included skipped integration assertions in its top-level passed counter. The final Vitest 4 report records 277 passed and 12 pending assertions; those skips are still not live proof.

### Logout regression: cause, minimal correction and affected boundaries

The supplied browser log failed two flows at the shared logout helper, not at evaluation persistence or invitation acceptance. Sanitized inspection of both traces showed POST /auth/v1/logout returned HTTP 204 with zero content bytes; the UI nevertheless displayed the sign-out failure alert. No tokens or trace request headers were copied into this report.

The body-buffering adapter introduced in this closure was the cause. Native Chromium exposed an empty stream for the successful 204 response. The adapter buffered it and constructed a new Response with a non-null byte array. The [Fetch standard's response initialization rule](https://fetch.spec.whatwg.org/#initialize-a-response) prohibits this for bodyless statuses, even when the array is empty. The exception was caught by the auth SDK and returned as a logout error, so the existing component correctly declined success navigation.

Before the fix, both a real Chromium reproduction and three new unit cases for 204/205/304 failed with the invalid-response-body exception. The production correction is one early-return condition: preserve the original response for these bodyless statuses. Existing finally cleanup still disposes the deadline. Ordinary JSON bodies retain their timeout, caller cancellation and size limit. Browser/server/admin Supabase clients, callback exchange, proxy and invitation delivery share this adapter; none of their roles, credentials, routes, permissions or logout scope changed. No database migration is required.

After the fix, all nine transport tests passed. Six Chromium checks verified 204/205/304, JSON status/header/cloning, genuine logout error handling, and successful 204 logout with cookie removal and requested login navigation. The installed auth SDK clears local credentials even on a remote logout error; this existing behavior was checked, not changed. A second synthetic sign-in precedes the successful logout check so it exercises the actual intercepted logout request rather than a sessionless no-op. Next navigation is controlled in this regression; the actual Next route transition still requires the guarded live browser run.

The first broad run after this correction reported 276 passed, 1 failed and 12 skipped, with STACK_TRACE_ERROR in the invitation-origin assertion. Its unchanged four-test file passed in isolation; the repeated unchanged full suite passed 277/277 local assertions. No invitation code, timeout, test assertion or retry policy was changed to conceal that result. Lint, TypeScript, ten-case evaluation, queue/browser-auth regressions, production build and full dependency audit subsequently passed.

### Development-tool remediation and verification

The initial reviewed candidate, Vitest 3.2.7 with Vite 6.4.3, passed the unchanged suite and removed the old critical/high findings, but a fresh audit found the newer redirect-mocker advisory. [The maintainer advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) states that older majors do not receive that fix. The final version is therefore Vitest 4.1.11, with its supported Vite 6.4.3 dependency explicitly pinned. No runtime framework, route, evidence score, authorization rule or test expectation was changed in this follow-up.

The host npm 10 resolver failed inside Arborist's peer-graph handling. A temporary npm 11.6.0 process generated the dependency graph without force or legacy-peer-dependency flags; npm 10.9.0 then normalized the lockfile and successfully installed it with npm ci. The project still declares npm 10.9.0; no global npm installation was changed. This clean-install check is important because the first npm 11-generated lockfile did not pass npm 10's validation of optional native dependencies.

One invitation-origin assertion failed in the parallel post-install run with the reporter's STACK_TRACE_ERROR; that report did not establish a cause. Its four-test file passed in isolation, and the repeated full suite passed without code/assertion/timeout changes. This observation is not proof that intermittent host/runner failures are eliminated. CI runs its gates sequentially, and no retry was added to conceal this result.

### Current production observations — existing deployment only

The read-only production smoke script passed against https://model-ops.vercel.app, including database readiness, security headers, correlation ID, login and protected-route redirect to /login?next=%2Fmodelops. The established bounded health probe returned 100/100 HTTP 200 responses at concurrency 10: zero transport/server/unhealthy/missing-request-ID failures; p50 204 ms, p95 1664 ms, p99 1772 ms, maximum 1827 ms.

These observations concern the existing deployment, whose exact correspondence to this uncommitted working tree is not established. They do not validate authenticated mutation capacity, live AI, current dashboard settings or deployment of these fixes.

## 4. Why the implementation stays small

One shared builder replaces duplicated fact generation; one fixed catalogue replaces unrestricted prose without adding RAG/vector infrastructure. Pure scoring/comparison/report functions stay separate from route orchestration. Existing authorization, persistence, review ledger and export routes are reused. Queue state is tied to its route/request lifecycle instead of adding global state or a second routing system.

The UI/UX skill influenced cancellation/loading/error/retry and URL authority, not visual redesign. Its guidance was applied within the existing component structure.

## 5. Required next validation — no new SQL for these fixes

From the directory containing package.json, with the separate disposable project's matching URL/publishable key:

```powershell
.\scripts\run-supabase-integration.ps1 -IntegrationUrl "https://oochvxuqmnhohjohksba.supabase.co" -PublishableKey "sb_publishable_ZCzRhftXc-w7vD2gNMHCPg_5vxoJYf8"
.\scripts\run-browser-e2e.ps1 -IntegrationUrl "https://oochvxuqmnhohjohksba.supabase.co" -PublishableKey "sb_publishable_ZCzRhftXc-w7vD2gNMHCPg_5vxoJYf8"
```

The runners prompt for the disposable secret. Do not paste it into chat or run fixture mutation/deletion on production. The user supplied both current passes on 2 October 2026: twelve integration tests in 12.87 seconds and ten browser flows in 2.0 minutes. This closes the previously pending live-browser check. Invitation warnings represent the manual-delivery fallback in the fixture flow, not proof of production email delivery. A release evidence bundle must still bind results to the reviewed committed revision; these supplied logs do not include that SHA.

The current bounded authenticated performance gate also passed according to the user. The saved baseline generated at `2026-10-02T20:39:53.169Z` confirms all measured requests succeeded with request IDs and unchanged budgets: create maximum 805 ms; slowest review mutation 1,810 ms; list/dashboard/review-queue p95 301/850/863 ms. This was local Next plus disposable Supabase with external AI disabled, not a production capacity or DDoS test. See [audit remediation results](audit-remediation-results.md) for the full workload, exact command and production route/release mismatch. Reviewed release publication is next; do not infer new-route deployment from the earlier, narrower production smoke or health probe.

Then review/merge this exact code, deploy and run production smoke/protected workflow under the release checklist. Do not infer current deployment success from historical outputs. Recheck live AI with only explicitly approved non-sensitive data if AI egress is enabled.

The development-tool remediation is complete locally. Keep current local test scripts in run mode, keep development/UI servers private, and retain the new full-audit CI gate. No force audit fix or peer-validation bypass was used.

The user chose to run the guarded live commands and share their outputs. Both current application env files point to the production Supabase project; they were not used for disposable fixture mutation/deletion. No disposable secret was copied from chat or substituted from production.

At the end collect member PR/AI-use records and actual final defense/demo evidence. Prepared templates and passing local tests cannot substitute for these facts.

## 6. Summary

Nine points have implemented/local-verified corrections or confirmed scope (1–8 and 10). Final live/submission evidence (9) remains pending. Runtime and development dependency audits are clean at this checkpoint. Saved evidence and existing tenant/role/route boundaries were preserved; no deployment or live database mutation was performed. Existing production smoke and bounded readiness observations passed, but do not substitute for deployment and protected-flow verification of this exact code.
