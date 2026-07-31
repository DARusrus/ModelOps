# Source Register

This is the bounded, approved list of trusted sources used by the ModelOps project.
Nothing outside this list should be treated as a verified source by the AI or the team.

| Source | URL | Access Date | Key Claim | Intended Use | Owner |
|---|---|---|---|---|---|
| MLflow Model Registry docs | https://mlflow.org/docs/latest/ml/model-registry/ | 2026-07-31 | The model registry tracks versioned models with stage transitions (staging/production/archived). | Reference for model versioning and lineage concepts | Zein |
| MLflow Model Signatures docs | https://mlflow.org/docs/latest/ml/model/signatures/ | 2026-07-31 | Model signatures define the expected input and output schema for a model. | Reference for input/output contract concepts | Zein |
| MLflow Documentation (general) | https://mlflow.org/docs/latest/ | 2026-07-31 | MLflow provides a standard framework for tracking ML experiments across their lifecycle. | Reference for experiment tracking terminology | Zein |
| Sample Experiment Records (internal) | tests/fixtures/modelops/sample-experiments.json | 2026-07-31 | Provides ground-truth example data with hand-verified readiness scores. | Trusted example data used for testing | Zein |
| Model Card Template (internal) | docs/model-card-template.md | 2026-07-31 | Defines the required fields every generated model card must include. | Defines model card structure | Zein |
| Readiness Checklist (internal) | docs/readiness-checklist.md | 2026-07-31 | Documents the exact point breakdown used by readiness_score_detail(). | Human-readable version of the scoring rubric | Zein |

## Notes
- "Internal" sources are files inside this repo, not external websites.
- Access date should be updated whenever a source is re-verified.
- Any URL an AI-generated model card cites under "references" should appear in this table — see src/lib/corpus/reference-checker.ts for an automated check.
