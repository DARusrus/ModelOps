import { describe, expect, it } from 'vitest';
import { EvidenceItemSchema, scoreEvidence } from '@/domain/modelops/evidence';

const base = [
  { kind: 'model_identity', label: 'Model', value: 'A 1.0.0', reference: 'input', provenance: 'submitted' as const },
  { kind: 'dataset', label: 'Dataset', value: 'D', reference: 'input', provenance: 'submitted' as const },
];

describe('evidence rubric', () => {
  it('does not award points to an AI suggestion', () => {
    const suggestion = EvidenceItemSchema.parse({ kind: 'metric', label: 'accuracy', value: '0.99', provenance: 'ai_suggestion', reference: 'run-1', attributes: { unit: 'proportion', evaluation_reference: 'run-1' } });
    expect(scoreEvidence([...base.map((item) => EvidenceItemSchema.parse(item)), suggestion]).score).toBe(25);
  });

  it('rejects a test sentence without result, date, and reference', () => {
    expect(() => EvidenceItemSchema.parse({ kind: 'test_run', label: 'test', value: 'security test', provenance: 'submitted' })).toThrow(/requires a result/i);
  });

  it('awards the full rubric only to complete structured evidence', () => {
    const evidence = [...base, { kind: 'metric', label: 'accuracy', value: '0.9', provenance: 'submitted' as const, reference: 'run-1', attributes: { unit: 'proportion', evaluation_reference: 'run-1' } }, { kind: 'risk', label: 'risk', value: 'bias', provenance: 'submitted' as const }, { kind: 'limitation', label: 'limit', value: 'domain shift', provenance: 'submitted' as const }, { kind: 'test_run', label: 'test', value: 'regression', provenance: 'submitted' as const, reference: 'ci-1', attributes: { test_result: 'passed' as const, executed_at: '2026-09-03T00:00:00.000Z' } }, { kind: 'reproducibility', label: 'repro', value: 'record', provenance: 'submitted' as const, attributes: { seed: '42', source_revision: 'abc123', environment_reference: 'sha256:def' } }].map((item) => EvidenceItemSchema.parse(item));
    expect(scoreEvidence(evidence).score).toBe(100);
  });
});
