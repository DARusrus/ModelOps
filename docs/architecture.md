# ModelOps — current architecture

Reviewed against source on 2026-10-02. This document supersedes Session 1 architecture claims; it does not assert that the latest working tree is deployed.

## 1. Request and evidence flow

Browser intake → Next route validation/authentication → shared request budget and idempotency claim → evidence-card builder → optional approved-guidance selection → deterministic evidence scoring → atomic database persistence → saved detail URL.

A later human action goes through its own authenticated review API and atomic database function. That function changes workflow state and appends an ordered, digest-linked review record. It does not regenerate or edit model evidence. Comparison reloads both saved IDs under the active organization.

## 2. Boundaries and files

| Layer | Files | Responsibility / consumer |
|---|---|---|
| App Router | `src/app/(workspace)/`, `src/proxy.ts`, `src/lib/auth/workspace-context.ts` | Server route gates, verified session, selected organization; route groups do not add URL segments |
| Authentication | `src/lib/auth/actor.ts`, `permissions.ts`, `continuation.ts`; `src/lib/supabase/verified-user.ts` | Verify session, load real membership, check capability, allow only safe local continuations |
| Presentation | `components/app-shell/`, `components/modelops/`, `dashboard/`, `reviews/` | URL-based pages, loading/error states; no privileged client import |
| Contracts | `src/domain/modelops/`, `domain/dashboard/`, `domain/reviews/` | Zod input, stored-data and output contracts |
| Evaluation | `src/lib/modelops/card.ts`, `service.ts`, `tools.ts` | Preserve submitted facts, official evidence score, deterministic saved-record comparison |
| Optional AI | `src/lib/ai/`, `src/lib/corpus/guidance.ts` | Select eligible catalogue IDs; strict parser renders approved text, not arbitrary generated facts |
| Persistence | `src/lib/supabase/`, `idempotency.ts`, `supabase/migrations/` | RLS, server-only RPC grants, tenant-bound atomic writes, retention |
| Reliability | `src/lib/network/timeout.ts`, `src/lib/ai/circuit-breaker.ts`, `provider-concurrency.ts` | Body-aware deadlines, shared circuit state and leased provider concurrency |
| Observability | `src/lib/observability/`, Sentry instrumentation, `logger.ts` | Correlation IDs and redacted structured diagnostics; not evidence of operational uptime |

## 3. Routes and roles

Public authentication routes and onboarding/invitation continuations are distinct from the protected workspace. `/dashboard` and catalog/detail require read access. Creation/comparison require evaluate/compare capabilities; `/reviews` requires review; member administration requires admin. `src/lib/auth/permissions.ts` is the capability map. APIs independently repeat authentication/authorization. Active-organization cookies are selectors, not proof of membership.

Viewer: read. Editor: read/evaluate/compare. Reviewer: those plus review. Admin: those plus administration. Self-attestation and independent-review modes are explicit organization policies, not hidden AI decisions.

## 4. Evidence, score and AI

`EvidenceItemSchema` validates shape, required result/date/reference and provenance fields. Public intake is always submitted evidence, even if a caller labels it verified. The current rubric is `2026-09-03.2`; it measures evidence coverage, not truth, safety, fairness or quality.

AI egress is disabled by default. When permitted, provider preference/fallback, model and credentials are server-owned. Current defaults are read from `env.ts`/`.env.example`, not fixed by this document. Provider response is exactly `{"guidance_ids":[...]}`. Selection is checked against eligible entries and the approved source register. Source text is local and versioned. No vector database, retrieval service, agentic tool execution or invented experiment analysis was added.

`deterministic_only`, `provider_unavailable` and `ai_suggestion_available` have different meanings. Invalid provider output is unavailable, and the API releases its reserved AI quota. Identity, metrics, score and generated `pending_human_review` decision stay server-owned.

## 5. Persistence and immutability

Saved evidence payloads are immutable through the application API. The editor means editable intake before saving; correction requires a new evaluation. Review state/history remain mutable only through authorized workflow actions. Expiration hides records; a separately installed scheduled retention function physically removes eligible data. No new migration is required by the handbook corrections.

Cards/evidence use one-year retention and audit history seven years under the approved project policy. Infrastructure backups and copies need their own retention controls; application expiry does not erase external backups.

## 6. Pagination and asynchronous UI

Catalog/review pages use bounded keyset pagination with a timestamp/UUID tie-breaker. Validated PostgreSQL timestamp precision is preserved, not rounded through JavaScript Date. Review filter comes from the URL prop. Aborted initial/pagination responses cannot overwrite another filter; active-filter clicks are no-ops and failures provide retry.

Managed Supabase fetch buffers bounded JSON bodies (5 MiB maximum) within its deadline. It is not a general streaming/SSE adapter. Provider deadlines remain active while reading their response body. Abort is a client/network bound, not a promise that a submitted database transaction rolled back; idempotency handles ambiguous write outcomes.

## 7. Scale and security limits

Stateless application instances share database-backed request/quota/circuit/concurrency controls. Small projections and indexes reduce unnecessary transfer. This is a sensible small-team architecture, not proof of unlimited traffic capacity or DDoS immunity. Vercel WAF, Supabase Auth limits, hosting/database capacity and regional latency require operational configuration and measurement. Health probes alone do not load-test authenticated mutations.

Current contracts: [API](api-contracts.md). Actual tests and remaining release gates: [verification](handbook-closure-results.md), [release checklist](release-checklist.md).
