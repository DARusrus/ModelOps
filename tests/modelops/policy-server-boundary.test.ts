import { describe, expect, it } from 'vitest';
import { evaluatePolicyCompliance } from '../../src/lib/modelops/policy';
import { ModelCardOutput } from '../../src/types/modelops';

const baseCard: ModelCardOutput = {
  model_name: 'Governed model', version: '1.0.0', dataset: 'Benchmark', intended_use: 'Internal evaluation', metrics: { accuracy: 0.95 }, readiness_score: 60, tests: [], reproducibility: 'Standard pipeline execution', decision: 'pending_human_review',
};

describe('server approval policy input', () => {
  it('blocks an approval decision when the persisted card fails the selected policy', () => {
    const decision = evaluatePolicyCompliance(baseCard, 'enterprise_general');
    expect(decision.isPassed).toBe(false);
    expect(decision.statusText).toBe('POLICY_BLOCKED');
  });

  it('uses the selected policy and rejects caller-supplied prose without structured evidence', () => {
    const decision = evaluatePolicyCompliance({ ...baseCard, readiness_score: 95, tests: ['validation'], reproducibility: 'seed: 7' }, 'healthcare_ai');
    expect(decision.policy.id).toBe('healthcare_ai');
    expect(decision.isPassed).toBe(false);
  });
});
