# Three-minute ModelOps demonstration

Prepared against current routes on 2026-10-02. This is a rehearsal script, not evidence the live defense was completed. Use non-sensitive synthetic data. Do not claim submitted metrics/tests were independently verified.

1. **0:00–0:30 — Sign in and choose organization.** Show /dashboard counts/activity and explain roles. Session, membership and capabilities are server-checked; organization cookie is only a selector.
2. **0:30–1:15 — Create evidence.** Open /evaluations/new. Show editable intake; submit a truthful synthetic example, adding structured metric/test/reproduction evidence if demonstrating full coverage. Explain missing facts and the generated pending_human_review decision. Do not promise an arbitrary preset score.
3. **1:15–1:45 — Reopen and review.** Open the saved /evaluations/[id] URL from catalog, refresh, then show policy/history. A human reviewer/admin submits, begins review and records an outcome allowed by organization review mode. Score is coverage, not approval; saved evidence is immutable.
4. **1:45–2:15 — Compare and export.** Choose two saved authorized records. Missing metrics are not measured; incompatible evidence produces no improvement inference. Show rubric versions. Export JSON for authoritative history/integrity; Markdown is only a summary.
5. **2:15–2:45 — Real failure path.** Try invalid intake (missing required model/dataset/use), or compare a metric absent in one record. Show the actual safe validation/not-measured result. Explain provider_unavailable fallback using the executed local test report if no live provider failure is available. Do not use an old simulation toolbar as proof of live behavior.
6. **2:45–3:00 — Boundaries and evidence.** Show ten-case report and known limits. Optional AI selects approved guidance IDs; score and human decisions cannot be supplied by the model. State which tests were local/mocked versus live.

## Defense essentials

- Routing: App Router route groups organize protected pages without changing URLs; APIs reauthorize independently.
- Security: verified session + membership + capability, RLS/server-only grants, bounded input, idempotency, shared budgets. No claim of DDoS immunity.
- AI: disabled by default; public non-sensitive declaration required if enabled; strict catalogue selection and safe fallback.
- Data: submitted evidence is not ground truth. Human attestation is digest-linked history, not a legal signature.
- Scale: provider leases and database-backed controls cross application instances; measured workload and hosting/database capacity set the practical limit.
- Editor: intake is editable, saved cards immutable; corrections create another evaluation.
