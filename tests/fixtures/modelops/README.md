# ModelOps Test Fixtures

`sample-experiments.json` — 5 example experiment records, aligned to the real
scoring rubric in `src/lib/modelops/tools.ts` (readiness_score_detail).
Each record includes an `expected_score` field for quick verification.

- **exp-001, exp-002**: both fully documented (expected_score: 100 each) —
  used to test compare_runs() when readiness is equal but individual
  metrics still differ (accuracy/loss improve from exp-001 to exp-002).
- **exp-003**: completely empty (expected_score: 0) — proves the score
  floor works and nothing is awarded by default.
- **exp-004**: missing input_shape, data_types, warnings, and
  reproducibility (expected_score: 70) — a realistic "ready with
  reservations" case.
- **exp-005**: complete except missing `warnings` (expected_score: 95) —
  tests the governance category cap when one small piece is missing.

Maintained by Zein. If `tools.ts`'s scoring rubric changes, recalculate
every `expected_score` here by hand and update this file.
