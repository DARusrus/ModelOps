# Source Register

This is the bounded, approved list of trusted sources used by the ModelOps project.
Nothing outside this list should be treated as a verified source by the AI or the team.


| Source | URL | Access Date | Intended Use | Owner |
|---|---|---|---|---|
| | MLflow Model Registry docs | https://mlflow.org/docs/latest/ml/model-registry/ |  Reference for model versioning, lineage, and metadata concepts used in our readiness rules | 
| MLflow Model Signatures docs | https://mlflow.org/docs/latest/ml/model/signatures/ | Reference for defining clear input/output contracts for model metadata | 
| MLflow Documentation (general) | https://mlflow.org/docs/latest/ | | Reference for experiment tracking and lifecycle terminology |
| Sample Experiment Records (internal) | tests/fixtures/modelops/sample-experiments.json | Trusted example data used for testing the app  |
| Model Card Template (internal) | docs/model-card-template.md |  Defines the required structure every AI-generated model card must follow | 
| Readiness Checklist (internal) | docs/readiness-checklist.md |  Human-readable version of the rules used inside readiness_score() |
## Notes
- "Internal" sources are files created inside this repo, not external websites — this is intentional, since ModelOps needs its own ground-truth data.
- Access date should be updated whenever a source is re-verified.
- Do not use any source that isn't listed here to justify an AI-written claim.
