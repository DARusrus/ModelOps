# Current readiness rubric

Source: `src/domain/modelops/evidence.ts`. Version: `2026-09-03.2`. Scoring is deterministic evidence coverage, never deployment approval.

| Criterion | Evidence required | Maximum | Partial points |
|---|---|---|---|
| Identity | model_identity | 10 | 0 or 10 |
| Evaluation dataset | dataset | 15 | 0 or 15 |
| Measured metrics | metric | 25 | 0 or 25 |
| Governance | risk and limitation | 25 | 12.5 for one kind |
| Verification | test_run and reproducibility | 25 | 12.5 for one kind |

Only submitted or verified-derived items score. AI suggestions and missing placeholders do not. Intake identity and dataset create submitted foundation items, so a valid sparse input normally scores 25. Adding arbitrary prose, named tests, metrics in an unstructured dictionary or an AI suggestion does not fill the structured criteria.

## Required evidence detail

1. Metric: unit, source reference and evaluation reference. Check the measurement yourself before relying on comparison.
2. Risk/limitation: model-specific boundaries and foreseeable harms. Presence is not severity assessment or risk mitigation proof.
3. Test run: result (passed/failed/inconclusive), execution timestamp and reference. A test name alone establishes neither execution nor success. The rubric measures coverage, so a recorded failed test can receive coverage points; humans must interpret the failure.
4. Reproducibility: seed, source revision and environment reference. These fields do not prove successful reproduction.

## Interpretation and comparison

A high score means required evidence categories are present, not that the claims were independently verified. There is no automatic “Ready for release” band. The generated decision remains pending_human_review and the persisted workflow records the human outcome.

Saved-card comparisons retain recorded scores. Different rubric versions produce a null readiness delta. Metric comparison needs measurements on both sides, compatible datasets, units and references. Unknown metric directions are not called improvements.

## Legacy compatibility

`src/lib/modelops/tools.ts` retains the old completeness formula for unversioned historical inputs and the five legacy JSON fixtures. That is not the production creation rubric. Do not use their old 70/95 scores as expected scores for new cards. New synthetic examples are in `tests/fixtures/modelops/current-experiments.ts`.
