# API contracts — current source

Reviewed 2026-10-02. Authoritative schemas: `src/domain/modelops/api-contracts.ts`, `model-card.ts`, `errors.ts`, `domain/dashboard/contracts.ts`, `domain/reviews/contracts.ts`, `domain/organization/`.

## Shared behavior

Protected APIs verify the authenticated user and selected organization's real membership/capability. The client cannot choose the actor or role. JSON writes use bounded request parsing (64 KiB), strict Zod schemas and no-store responses. Wrapped endpoints include X-Request-Id. Error bodies are `{success:false,code,error,details?}`; 401 authentication, 403 authorization, 400 validation, 409 conflicts, 413 size, 415 media type, 429 budget, 503 unavailable controls/storage, 500 unexpected/contract error. Check each route's exact mapping rather than assuming every endpoint uses every code.

## Evaluation APIs

| Method / route | Contract and behavior |
|---|---|
| POST /api/modelops | evaluate capability; JSON ExperimentMetadataSchema; Idempotency-Key UUID required; returns the card directly with record_id, not a success/data wrapper |
| GET /api/modelops | read; bounded summary page, not full card payloads |
| GET /api/modelops/[id] | read; `{success:true,evaluation}`; absent/expired/other tenant is 404 |
| POST /api/modelops/compare | compare; `{baseline_id,candidate_id}` only; server reloads both saved records |
| POST /api/modelops/[id]/review | state/role policy; `{action,reason,policy_id}`; Idempotency-Key required; atomic workflow attestation |
| GET /api/modelops/[id]/history | authorized persisted review history/integrity |
| GET /api/modelops/[id]/export | authorized JSON dossier containing persisted card/history/integrity |

There is no public PATCH/PUT for saved model-card facts.

Minimum illustrative intake (scores 25 under the current rubric, not 100):

```json
{"model_name":"Demonstration","version":"1","dataset":"submitted-benchmark","intended_use":"Teaching","metrics":{},"data_classification":"unclassified"}
```

Current scoring requires structured `evidence_items`, not just named tests or a metrics dictionary. Metric evidence needs a reference/unit/evaluation reference; test evidence needs result/date/reference; reproducibility needs seed/revision/environment. See [rubric](readiness-checklist.md).

Catalog queries: q, state, creator (me or UUID), created_from/to (valid ISO dates), readiness_min/max (0–100), sort (newest/oldest), cursor and limit (1–50; default 20). Repeated/unknown/reserved/contradictory filters are rejected. Response: success, evaluations, page_size, has_more, next_cursor. Cursors preserve timestamp precision and sort direction.

Comparison response: `{success:true,comparison}` with names/versions, metric diffs, recorded scores, rubric versions, readiness_delta and summary. Mixed rubrics yield null readiness_delta. Noncomparable metric diffs have null delta and an explicit status/reason; missing measurements are null rather than zero.

## Dashboard and review queue

GET /api/dashboard requires read capability; returns success/dashboard with active_evaluations, review_required, six workflow counts, up to ten recent evaluations and ten sanitized activity items. No raw audit payloads or arbitrary actor identifiers are exposed.

GET /api/reviews requires review; state is all/submitted/under_review, limit 1–50, validated newest cursor. Response: success, reviews, page_size, has_more, next_cursor. Rows include model identity, score, workflow, author email and timestamps. Author projection is intentional reviewer-only information; drafts and changes_requested are excluded. Request organization/actor fields are not accepted.

## Organization and authentication

POST /api/organization/active selects a validated organization membership. POST /api/organization/onboarding creates the confirmed user's initial organization atomically. GET/PATCH /api/organization/governance reads/sets permitted review mode.

Invitation list/create, renew/revoke and accept live under /api/organization/invitations and its ID subroutes. Member list and role/remove live under /api/organization/members. Server-only administrative functions verify tenant/admin and final-admin protection. Invitation acceptance checks authenticated email, expiry and status; accepting a link does not create a second personal workspace automatically.

Browser login/signup/password flows call Supabase Auth, with continuation via /auth/callback. Those direct authentication requests are outside Vercel application WAF coverage.

GET /api/health is unauthenticated readiness, with a short database-probe cache. A healthy response says nothing about mutation authorization, provider health or unlimited throughput.

## AI internal contract

Provider returns only `{"guidance_ids":["human_review"]}` or other eligible catalogue IDs. It is not the public card response. Invalid JSON, unknown/ineligible IDs and extra fields are unavailable suggestions, not AI success. AI quota reservation is released for unavailable/deterministic results; evidence/card score remain usable.

