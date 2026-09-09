import { describe, expect, it } from 'vitest';
import { evaluatePolicyCompliance } from '../../src/lib/modelops/policy';
import { ModelCardOutput } from '../../src/types/modelops';

const completeEvidence = [
  { kind: 'model_identity' as const, label: 'Model', value: 'Clinical model', provenance: 'submitted' as const, reference: 'model-card-input' },
  { kind: 'dataset' as const, label: 'Dataset', value: 'Benchmark', provenance: 'submitted' as const, reference: 'dataset-card' },
  { kind: 'metric' as const, label: 'accuracy', value: '0.95', provenance: 'submitted' as const, reference: 'run-1', attributes: { unit: 'ratio', evaluation_reference: 'run-1' } },
  { kind: 'metric' as const, label: 'latency_ms', value: '22', provenance: 'submitted' as const, reference: 'run-1', attributes: { unit: 'ms', evaluation_reference: 'run-1' } },
  { kind: 'metric' as const, label: 'f1', value: '0.94', provenance: 'submitted' as const, reference: 'run-1', attributes: { unit: 'ratio', evaluation_reference: 'run-1' } },
  { kind: 'risk' as const, label: 'Risk', value: 'Bias', provenance: 'submitted' as const },
  { kind: 'limitation' as const, label: 'Limitation', value: 'Domain shift', provenance: 'submitted' as const },
  { kind: 'mitigation' as const, label: 'Mitigation', value: 'Human review', provenance: 'submitted' as const },
  { kind: 'test_run' as const, label: 'Red-team verification', value: 'Passed red team suite', provenance: 'submitted' as const, reference: 'ci-1', attributes: { test_result: 'passed' as const, executed_at: '2026-09-03T00:00:00.000Z' } },
  { kind: 'reproducibility' as const, label: 'Reproducibility', value: 'Reproducible run', provenance: 'submitted' as const, attributes: { seed: '42', source_revision: 'abc123', environment_reference: 'sha256:def' } },
];

const highScoringCard: ModelCardOutput = {
  model_name: 'Clinical-Diagnostic-BERT', version: '2.0.0', dataset: 'MIMIC-IV-Deidentified', intended_use: 'Clinical diagnostic summarization', metrics: { accuracy: 0.95, f1_score: 0.94, latency_ms: 22 }, readiness_score: 95, decision: 'pending_human_review', input_shape: '512 tokens', evidence_items: completeEvidence,
};

describe('Governance policy evidence enforcement', () => {
  it('passes a policy only when its structured evidence requirements are present', () => {
    const result = evaluatePolicyCompliance(highScoringCard, 'healthcare_ai');
    expect(result.isPassed).toBe(true);
    expect(result.statusText).toBe('POLICY_PASSED');
  });

  it('does not treat prose-only tests or reproducibility fields as evidence', () => {
    const result = evaluatePolicyCompliance({ ...highScoringCard, evidence_items: completeEvidence.filter((item) => !['test_run', 'reproducibility', 'mitigation'].includes(item.kind)), tests: ['passed'], reproducibility: 'seed=42' }, 'healthcare_ai');
    expect(result.isPassed).toBe(false);
    expect(result.unmetRules).toEqual(expect.arrayContaining([
      'Missing passed verification-test evidence.',
      'Missing submitted mitigation evidence.',
      'Missing structured reproducibility evidence.',
    ]));
  });

  it('requires explicit red-team evidence for the generative-AI profile', () => {
    const result = evaluatePolicyCompliance({ ...highScoringCard, evidence_items: completeEvidence.map((item) => item.kind === 'test_run' ? { ...item, label: 'Regression suite', value: 'Passed checks' } : item) }, 'genai_llm_ai');
    expect(result.isPassed).toBe(false);
    expect(result.unmetRules).toContain('Missing passed red-team test evidence.');
  });
});
