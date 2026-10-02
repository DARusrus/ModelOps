import { describe, expect, it } from 'vitest';
import { generateMarkdownReport } from '../../src/lib/modelops/markdown-report';
import { EvidenceItemSchema } from '../../src/domain/modelops/evidence';

describe('evidence-faithful Markdown export', () => {
  const card = { model_name: 'A', version: '1', dataset: 'D', metrics: {}, intended_use: 'test', readiness_score: 25, decision: 'pending_human_review' as const, tests: ['Named-only test'] };
  it('does not turn a declared test into a completed check', () => {
    const text = generateMarkdownReport(card, '2026-10-02');
    expect(text).toContain('Named-only test');
    expect(text).not.toContain('[x]');
    expect(text).toContain('execution/result not established');
    expect(text).toContain('not a deployment approval');
  });
  it.each(['passed', 'failed', 'inconclusive'] as const)('preserves the %s result and its reference', (test_result) => {
    const evidence = EvidenceItemSchema.parse({ kind: 'test_run', label: 'Regression', value: 'Test run', provenance: 'submitted', reference: 'ci-1', attributes: { test_result, executed_at: '2026-10-02T00:00:00Z' } });
    const text = generateMarkdownReport({ ...card, evidence_items: [evidence], workflow_state: 'rejected' });
    expect(text).toContain('Regression: ' + test_result);
    expect(text).toContain('Workflow state: rejected');
    expect(text).toContain('ci-1');
  });
});
