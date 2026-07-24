# ModelOps Test Fixtures

`sample-experiments.json` — 5 example experiment records used across tests and demos.

- exp-001, exp-002: same model, two versions — used to test compare_runs()
- exp-003: intentionally incomplete (no limitations/tests/risks/reproducibility) — used to test that readiness_score() correctly penalizes missing data
- exp-004: partially complete — realistic "almost ready" case
- exp-005: a different model — ensures logic generalizes beyond one model
