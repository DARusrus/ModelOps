import type { ExperimentMetadata } from '@/types';
import type { EvidenceItem } from '@/domain/modelops/evidence';

// Synthetic examples, not evidence that a real model passed these tests.
export const completeEvidence: EvidenceItem[] = [
  { kind: 'metric', label: 'accuracy', value: '0.9', provenance: 'submitted', reference: 'fixture:metrics', attributes: { unit: 'fraction', evaluation_reference: 'fixture:benchmark' } },
  { kind: 'risk', label: 'Risk', value: 'Distribution shift', provenance: 'submitted' },
  { kind: 'limitation', label: 'Limitation', value: 'English only', provenance: 'submitted' },
  { kind: 'test_run', label: 'Regression', value: 'Synthetic result', provenance: 'submitted', reference: 'fixture:test', attributes: { test_result: 'passed', executed_at: '2026-10-02T00:00:00Z' } },
  { kind: 'reproducibility', label: 'Reproduction', value: 'Synthetic environment', provenance: 'submitted', attributes: { seed: '42', source_revision: 'fixture:revision', environment_reference: 'fixture:environment' } },
];
const base: ExperimentMetadata = { model_name: 'Handbook fixture', version: '1', dataset: 'synthetic-benchmark', intended_use: 'Teaching demonstration', metrics: { accuracy: 0.9 } };
export const currentExperiments: ExperimentMetadata[] = [
  { ...base, evidence_items: completeEvidence },
  { ...base, version: '2', metrics: { accuracy: 0.92 }, evidence_items: completeEvidence.map((item) => item.kind === 'metric' ? { ...item, value: '0.92' } : item) },
  { ...base, model_name: 'Sparse fixture', metrics: {} },
  { ...base, model_name: 'Partial fixture', evidence_items: completeEvidence.slice(0, 3) },
  { ...base, model_name: 'Unknown dataset fixture', dataset: 'unknown_dataset_xyz.csv', tests: ['Named but not executed'] },
];
