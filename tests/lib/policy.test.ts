import { describe, it, expect } from 'vitest';
import {
  STANDARD_GOVERNANCE_POLICIES,
  evaluatePolicyCompliance,
  createAuditSignOff,
} from '../../src/lib/modelops/policy';
import { ModelCardOutput } from '../../src/types/modelops';

describe('Governance Policy & Audit Trail Engine', () => {
  const highScoringCard: ModelCardOutput = {
    model_name: 'Clinical-Diagnostic-BERT',
    version: '2.0.0',
    dataset: 'MIMIC-IV-Deidentified',
    intended_use: 'Clinical diagnostic summarization',
    metrics: { accuracy: 0.95, f1_score: 0.94, latency_ms: 22.0 },
    readiness_score: 95,
    decision: 'pending_human_review',
    tests: ['5-Fold Cross Validation', 'Fairness Subgroup Audit'],
    reproducibility: 'seed: 42 sha256:abcd1234efgh5678',
  };

  const lowScoringCard: ModelCardOutput = {
    model_name: 'Incomplete-Prototype',
    version: '0.1.0',
    dataset: 'test.csv',
    intended_use: 'Draft testing',
    metrics: { accuracy: 0.70 },
    readiness_score: 40,
    decision: 'pending_human_review',
  };

  it('should pass compliance when model meets policy score threshold and mandates', () => {
    const res = evaluatePolicyCompliance(highScoringCard, 'healthcare_ai');
    expect(res.isPassed).toBe(true);
    expect(res.statusText).toBe('POLICY_PASSED');
    expect(res.unmetRules.length).toBe(0);
  });

  it('should block release when model is below policy minimum threshold', () => {
    const res = evaluatePolicyCompliance(lowScoringCard, 'healthcare_ai');
    expect(res.isPassed).toBe(false);
    expect(res.statusText).toBe('POLICY_BLOCKED');
    expect(res.unmetRules.length).toBeGreaterThan(0);
  });

  it('should create an immutable audit sign-off with SHA-256 signature hash', () => {
    const policy = STANDARD_GOVERNANCE_POLICIES[0];
    const signOff = createAuditSignOff(highScoringCard, policy, {
      reviewer_name: 'Dr. Alan Turing',
      reviewer_role: 'Lead AI Auditor',
      department: 'Safety & Compliance Group',
      notes: 'Passed all verification tests.',
    });

    expect(signOff.audit_id).toBeDefined();
    expect(signOff.reviewer_name).toBe('Dr. Alan Turing');
    expect(signOff.policy_status).toBe('POLICY_PASSED');
    expect(signOff.signature_hash).toMatch(/^sha256:[a-f0-9]+/);
    expect(signOff.timestamp).toBeDefined();
  });
});
