# Known limits — current implementation

Reviewed 2026-10-02. This replaces obsolete API-only, missing-metric-zero and automatic-release descriptions.

1. **Evidence is submitted, not independently verified.** A valid source reference or dataset name is not a file lookup, executed benchmark or signature verification. A declared dataset remains submitted; no external dataset registry integration exists.
2. **Readiness measures coverage.** A documented failed test earns category coverage just as a documented passed test can. Test quality, risk severity, fairness and actual reproducibility require human scrutiny.
3. **Comparison is conditional.** Missing metrics are null, not zero. Structured comparisons require compatible datasets and metric units/references. Dataset identifiers and measurement context are still user assertions. Unknown directions are not improvements.
4. **AI is optional constrained guidance.** The small local catalogue is not broad research or retrieval. Prompts/redaction reduce risk but cannot classify sensitive data perfectly; the explicit declaration is a user responsibility. Invalid selections use safe fallback. Live provider validation is separate from mocked tests.
5. **Historical records remain historical.** Existing scores, narratives and attestations are not rewritten. Mixed rubrics have no readiness delta. Older saved AI narratives may not meet the new catalogue-only contract.
6. **Editor means intake, not revision.** Corrections create new saved evaluations. This agreed scope avoids mutating attested evidence; linked revision lineage is not implemented. Accepted hyperparameters are not retained in the model-card output schema.
7. **Bounded capacity, not DDoS immunity.** Shared quotas/rate limits/provider leases protect specific operations, not every resource or external login endpoint. Vercel firewall and Supabase Auth limits need deployment verification. No “many users” claim is established by a 100-request health probe.
8. **Network uncertainty remains.** Timeout limits client wait; a timed-out write may already have committed. Retry must use idempotency. Supabase JSON responses are capped at 5 MiB; streaming exports/SSE should not use that adapter.
9. **Operational and submission proof remains separate.** Live database/browser/performance tests, the latest deployed commit, current security settings, member PR attribution, individual AI-use records and live defense/demo need actual evidence.
10. **Not a certification or model execution system.** No training, inference validation, bias audit, legal approval or safety-critical deployment decision is performed. Non-English and unusual metric semantics are not comprehensively validated.

Use the system to organize evidence and human decisions, not to substitute for independent verification, regulatory advice or a deployment safety assessment.
