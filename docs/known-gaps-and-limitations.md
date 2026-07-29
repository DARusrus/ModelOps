# Known Gaps & Limitations

Required documentation for the Knowledge, Tools & Quality role — an honest
account of what ModelOps' real, merged rubric does and does not cover.

## 1. Coverage Gaps

- **Metric direction detection is name-based, not guaranteed correct.**
  `compare_runs()` treats a metric as "lower is better" only if its key
  name contains "loss" or "error" (case-insensitive substring match).
  This is broader than a fixed list, but it can still misfire: a metric
  named `error_analysis_score` would incorrectly be treated as
  lower-is-better, and a genuinely lower-is-better metric like
  `perplexity` or `mae` would be missed entirely and treated as
  higher-is-better by default.
- **Missing metrics default to 0 instead of "not measured."** If a run
  never tracked a metric that another run did, `compare_runs()` currently
  shows it jumping from 0 to whatever value was measured and can label
  this "improved" — which can be misleading. This is a specific, flagged
  finding (see `KNOWN_QUALITY_FINDINGS` in `tool-rules.ts`), not yet fixed.
- **Test *type* is checked, not test *quality*.** `readiness_score_detail()`
  only checks whether the `tests` array is non-empty. A single low-quality
  test scores identically to a thorough one.
- **Risk severity is defined but unused.** `taxonomy.ts` defines four
  severity levels (low/medium/high/blocking), but the real scoring only
  checks whether `risks` is non-empty — a "blocking" risk currently
  scores identically to a "low" one.
- **Reproducibility is checked for presence and non-genericness, not
  correctness.** Any specific-sounding text earns full points, even if
  the actual seed/run ID is fabricated or wrong.
- **Source register is narrow.** Currently covers MLflow documentation
  only.
- **English-only assumption.** No multilingual handling has been built
  or tested for any text field.
- **No bias/fairness verification.** The system checks whether a
  bias/fairness test was *documented* — it does not verify the test was
  correct or sufficient.
- **Frontend integration is API-only for Beta release.** Due to integration
  scope limits, the current production deployment (v1.0.0) is an API-only Beta.
  The React/Tailwind user interface component is complete but not yet
  integrated into the live production application.

## 2. Prohibited Use Cases

- **Not a substitute for legal or regulatory compliance certification.**
- **Not for safety-critical or medical decision-making without full
  independent review.**
- **Never auto-approves deployment** — every "Ready" decision still
  requires explicit human sign-off.
- **Not a bias/fairness audit tool** — confirms a test was documented,
  not that the model is actually fair.
- **Not to be used to justify claims with sources outside the source
  register** (`docs/source-register.md`).
- **Comparison results should not be treated as proof of improvement
  without checking both runs actually measured the same metrics** — see
  the missing-metrics-default-to-0 gap above.

## 3. How this list should evolve

This document should be updated whenever the scoring rubric in `tools.ts`
changes, whenever a new quality finding is discovered, or whenever a gap
listed here gets resolved. Last reviewed against the merged rubric
(Model Identification / Dataset & Input Schema / Evaluation Metrics /
Governance / Testing & Reproducibility, 10+15+25+25+25).
