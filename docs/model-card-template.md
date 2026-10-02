# Model card and editor contract

Source of truth: `src/domain/modelops/model-card.ts` and `api-contracts.ts`; input UI: `src/components/modelops/InputForm.tsx`; builder: `src/lib/modelops/card.ts`.

## 1. Editor scope — confirmed

The user edits intake before saving. Saved cards are immutable evidence snapshots, not editable documents. To correct an evaluation, create another record/version; do not overwrite an attested payload. Review actions can update the authorized workflow and append history, not edit experiment facts. No saved-card revision API is part of this scope.

## 2. Facts and unknowns

Identity/version/dataset, metric values, intended use, declared risks/limitations/tests and supplied input shape/datatype are submitted facts, not independently verified findings. Additional intake metadata is retained in the metadata object where supported by the schema.

The builder marks absent shape/distribution/reproduction information as “Not supplied.” and missing arrays as empty. Model type is not datatype; data split is not tensor shape; volume/preprocessing is not a statistical distribution. Missing framework/developer are not inferred. Hyperparameters are accepted in intake but are not currently an output-schema field; do not claim the exported card stores them.

## 3. Evidence and computed fields

Structured evidence includes provenance and source references, with kind-specific metric/test/reproducibility requirements. Public submissions are labelled submitted. Readiness score, rubric and breakdown come from the deterministic evidence rubric.

AI fields contain optional selected guidance, status, prompt version and approved references. No arbitrary provider model facts or approval prose enter new cards. Historical saved cards are not retroactively rewritten or revalidated by this change.

## 4. Human workflow

Draft → submitted → under_review → approved / rejected / changes_requested. Changes requested can be resubmitted under the existing transition policy. Role and organization review mode decide who can act; an AI is not a reviewer. The generated pending_human_review field is distinct from persisted workflow_state.

The review ledger records actor/evidence/rubric/digests and is tamper-evident, not a legal electronic signature or protection against a fully privileged database operator.

## 5. Export

Markdown/print is a readable summary. Declared test names are not ticked as passed; structured result/date/reference are shown separately and still labelled submitted evidence. Authenticated JSON dossier includes the persisted record, review history and integrity result. Neither format proves model safety or legal compliance.
