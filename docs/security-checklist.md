# Security controls and validation

Reviewed against source on 2026-10-02. Implementation is not equivalent to current production configuration. Use [release gates](release-checklist.md) for environment proof.

| Boundary | Implementation | Validation |
|---|---|---|
| Session and tenant | verified-user, actor, workspace context; real memberships; server-only admin client | auth/API tests, architecture import checks; disposable RLS/browser suites |
| Capability | permissions.ts; route and API checks; trusted RPC checks | viewer/editor/reviewer/admin and cross-tenant tests |
| Immutable card | saved detail route exports GET only; writes through atomic server persistence/review RPCs | immutable-route guard, review ledger/integration tests |
| JSON input | strict Zod contracts; streamed 64 KiB maximum; bounded fields/evidence | validators, http, API malformed/unknown/oversize tests |
| Retry writes | Idempotency-Key plus fingerprint, atomic persistence/review | conflict/replay/concurrent live integration |
| Abuse and cost | shared evaluate/compare budgets; AI daily/monthly quota; provider leases/circuit | shared-rate/quota/provider tests; separately verify WAF/Auth infrastructure |
| AI egress | disabled default; explicit public non-sensitive declaration when enabled; redaction | service/prompt tests; live data-policy approval remains required |
| AI content | eligible approved IDs only, strict schema, server-rendered catalogue text | invalid/unknown/ineligible/injection ten-case and parser tests |
| Timeout | managed-service headers and body deadline, caller abort, 5 MiB body cap; provider body deadline | network-timeout and provider cancellation tests |
| Headers and telemetry | proxy nonce CSP, security headers, request IDs; Sentry filters/logging | http/observability tests; deployed smoke/source-map checks |

## Secrets and deployment

Keep Supabase secret, Groq/Gemini keys and Sentry source-map token server/build-only. NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and ingest DSN are intentionally public identifiers, not privileged credentials. .env files are ignored; placeholders in .env.example are not working secrets. Ignoring files does not prove no historical secret exposure: review history and rotate anything exposed separately.

No client import of privileged Supabase admin code is allowed; architecture tests enforce this. Authentication calls from the browser go directly to Supabase and require its own rate-limit controls. WAF rules must match the intended methods/paths; application 429 alone does not prove the WAF acted.

## What this does not guarantee

- Submitted evidence is not independently verified; unknown datasets are not certified by source registration.
- Digest-linked history is tamper-evident under the implemented threat model, not a legal signature or immunity to privileged database changes.
- Source-register matching is not factual entailment; catalogue-only output prevents arbitrary AI claims in new cards.
- A good score does not prove fairness, safety, compliance or test success.
- Unit tests and small load probes do not establish DDoS immunity, production capacity or absence of all vulnerabilities.
- Runtime npm audit and full tooling audit are separate; record both findings honestly.

No new authentication, role, SQL policy or database migration was added for the handbook corrections. Existing dirty Batch 7 changes are preserved and separately included in the broad regression gates.
