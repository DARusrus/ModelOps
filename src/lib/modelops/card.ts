import { ModelCardOutputSchema } from '@/domain/modelops/model-card';
import type { ExperimentMetadata } from '@/types';

/** Facts are copied from submitted metadata, never inferred from a neighbouring field. */
export function buildEvidenceCard(metadata: ExperimentMetadata) {
  const {
    model_name, version, dataset, metrics, intended_use, framework, task_type,
    input_shape, data_types, limitations, risks, tests, reproducibility,
    evidence_items, hyperparameters, ...extendedMetadata
  } = metadata;
  void hyperparameters;
  return ModelCardOutputSchema.parse({
    model_name, version, dataset, metrics: metrics || {}, intended_use,
    framework, task_type, metadata: extendedMetadata,
    experiment_info: `Evaluation record for ${model_name} ${version} using dataset ${dataset}.`,
    input_shape: input_shape || 'Not supplied.', data_types: data_types || [],
    distribution_summary: 'Not supplied.', limitations: limitations || [], risks: risks || [],
    tests: tests || [], reproducibility: reproducibility || 'Not supplied.',
    readiness_score: 0, decision: 'pending_human_review', evidence_items: evidence_items || [],
    ai_analysis: 'No AI suggestions were used. Submitted evidence remains available for human review.',
    evidence: [`Model name: ${model_name}`, `Dataset: ${dataset}`, `Developed by: ${metadata.developed_by || 'Not supplied.'}`],
  });
}
