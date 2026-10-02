# Approved source register

Reviewed 2026-10-02. Runtime allowlist: src/lib/corpus/source-register.ts. A registered source is not evidence that any arbitrary claim is supported, nor a dataset lookup.

| Source | Location | Supported use |
|---|---|---|
| MLflow Model Registry | [Official documentation](https://mlflow.org/docs/latest/ml/model-registry/) | Version, lineage, aliases and model metadata concepts; not proof this application integrates MLflow |
| MLflow Model Signatures | [Official documentation](https://mlflow.org/docs/latest/ml/model/signatures/) | Input/output/parameter contract concepts |
| MLflow general documentation | [Official documentation](https://mlflow.org/docs/latest/) | Background tracking terminology; not used to generate experiment facts |
| Legacy examples | tests/fixtures/modelops/sample-experiments.json | Synthetic old completeness-rubric expectations, not real model results |
| Current examples | tests/fixtures/modelops/current-experiments.ts | Five synthetic inputs and structured evidence; covered by the ten-case suite |
| Model-card template | docs/model-card-template.md | Editor scope, immutable evidence and human review boundary |
| Readiness checklist | docs/readiness-checklist.md | Current coverage rubric and evidence requirements |
| Known limits | docs/known-gaps-and-limitations.md | Non-certification and evidence/operational limits |
| Approved guidance | src/lib/corpus/guidance.ts | Versioned, fixed instructions supported by the local checklist/template |

## Runtime grounding

Guidance version 2026-10-02.1:

1. missing_metrics: request measured metric/unit/evaluation reference.
2. missing_risks: request risks/limitations; do not claim fairness or safety.
3. missing_tests: request actual result/date/reference, not a test name.
4. missing_reproducibility: request seed/source revision/environment reference.
5. human_review: human review is mandatory; AI/score does not approve deployment.

Providers select eligible IDs only. The server verifies each ID and approved local source, then renders the fixed catalogue text. No arbitrary provider prose or outside URL enters a newly generated card. Sources are displayed with the guidance. The catalogue is intentionally small; this is constrained selection, not a research agent or retrieval-augmented generation service.

“Submitted dataset” remains unverified unless a separately designed verification process provides evidence. Five examples are synthetic test fixtures, never ground truth for real models.

External registry/signature pages were checked on 2026-10-02. Historical general-documentation access remains dated in the code; no new visit is implied. Technical implementation references (React, Fetch, security advisory) are listed in the closure plan, separately from the domain guidance allowlist.
