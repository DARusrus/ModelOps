import { EvidenceItem, EvidenceItemSchema } from '@/domain/modelops/evidence';
import { ModelCardOutput, ReadinessPolicy } from '@/types/modelops';

export const STANDARD_GOVERNANCE_POLICIES: ReadinessPolicy[] = [
  { id: 'healthcare_ai', name: 'Healthcare & Clinical AI Review Profile', domain: 'Healthcare', min_score: 90, description: 'Internal review profile for clinical-model evidence, reproducibility, mitigations, and risk disclosure.', mandatory_rules: ['Minimum readiness score: 90/100', 'Passed verification-test evidence', 'Submitted mitigation evidence', 'Structured reproducibility evidence'] },
  { id: 'fin_fraud_ai', name: 'Financial Fraud & Credit Risk Standard', domain: 'Financial Fraud', min_score: 85, description: 'Internal review profile for explainability, operational risk disclosure, and latency evidence.', mandatory_rules: ['Minimum readiness score: 85/100', 'Three measured metrics including latency', 'Submitted risk evidence'] },
  { id: 'genai_llm_ai', name: 'Generative AI & LLM Safety Guardrails', domain: 'Generative AI', min_score: 85, description: 'Internal review profile for mitigations, red-team test evidence, and reproducibility.', mandatory_rules: ['Minimum readiness score: 85/100', 'Submitted mitigation evidence', 'Red-team test evidence', 'Structured reproducibility evidence'] },
  { id: 'cv_edge_ai', name: 'Computer Vision & Edge Deployment Standard', domain: 'Computer Vision', min_score: 80, description: 'Internal review profile for runtime instrumentation and robustness evidence.', mandatory_rules: ['Minimum readiness score: 80/100', 'Documented input schema', 'Measured latency evidence'] },
  { id: 'enterprise_general', name: 'Enterprise General Governance Standard', domain: 'Enterprise Standard', min_score: 75, description: 'Baseline internal policy for evidence, risk disclosure, and limitations.', mandatory_rules: ['Minimum readiness score: 75/100', 'Submitted risk evidence', 'Submitted limitation evidence'] },
];

export interface PolicyEvaluationResult {
  policy: ReadinessPolicy;
  isPassed: boolean;
  scoreDelta: number;
  unmetRules: string[];
  statusText: 'POLICY_PASSED' | 'POLICY_BLOCKED';
  justification: string;
}

function scoredEvidence(card: ModelCardOutput): EvidenceItem[] {
  return (card.evidence_items || [])
    .map((item) => EvidenceItemSchema.parse(item))
    .filter((item) => item.provenance === 'submitted' || item.provenance === 'verified_derived');
}

function hasKind(evidence: readonly EvidenceItem[], kind: EvidenceItem['kind']) {
  return evidence.some((item) => item.kind === kind);
}

function hasPassedTest(evidence: readonly EvidenceItem[]) {
  return evidence.some((item) => item.kind === 'test_run' && item.attributes?.test_result === 'passed');
}

function hasLatencyMetric(evidence: readonly EvidenceItem[]) {
  return evidence.some((item) => item.kind === 'metric' && /(?:latency|response[_ -]?time|inference[_ -]?time)/i.test(item.label));
}

function hasRedTeamEvidence(evidence: readonly EvidenceItem[]) {
  return evidence.some((item) => item.kind === 'test_run' && item.attributes?.test_result === 'passed' && /red[ -]?team/i.test(`${item.label} ${item.value}`));
}

/**
 * Policies intentionally inspect only persisted, provenance-bearing evidence.
 * Human-readable fields may explain a card, but cannot satisfy a release rule.
 */
export function evaluatePolicyCompliance(card: ModelCardOutput, policyId?: string): PolicyEvaluationResult {
  const policy = STANDARD_GOVERNANCE_POLICIES.find((item) => item.id === policyId) || STANDARD_GOVERNANCE_POLICIES[4];
  const evidence = scoredEvidence(card);
  const unmetRules: string[] = [];
  const currentScore = card.readiness_score || 0;

  if (currentScore < policy.min_score) {
    unmetRules.push(`Readiness score (${currentScore}/100) is below the required minimum of ${policy.min_score}/100.`);
  }

  if (policy.id === 'enterprise_general') {
    if (!hasKind(evidence, 'risk')) unmetRules.push('Missing submitted risk evidence.');
    if (!hasKind(evidence, 'limitation')) unmetRules.push('Missing submitted limitation evidence.');
  }
  if (policy.id === 'healthcare_ai') {
    if (!hasPassedTest(evidence)) unmetRules.push('Missing passed verification-test evidence.');
    if (!hasKind(evidence, 'mitigation')) unmetRules.push('Missing submitted mitigation evidence.');
    if (!hasKind(evidence, 'reproducibility')) unmetRules.push('Missing structured reproducibility evidence.');
  }
  if (policy.id === 'fin_fraud_ai') {
    if (evidence.filter((item) => item.kind === 'metric').length < 3) unmetRules.push('At least three structured metric-evidence items are required.');
    if (!hasLatencyMetric(evidence)) unmetRules.push('Missing measured latency evidence.');
    if (!hasKind(evidence, 'risk')) unmetRules.push('Missing submitted operational-risk evidence.');
  }
  if (policy.id === 'genai_llm_ai') {
    if (!hasKind(evidence, 'mitigation')) unmetRules.push('Missing submitted safety-mitigation evidence.');
    if (!hasRedTeamEvidence(evidence)) unmetRules.push('Missing passed red-team test evidence.');
    if (!hasKind(evidence, 'reproducibility')) unmetRules.push('Missing structured reproducibility evidence.');
  }
  if (policy.id === 'cv_edge_ai') {
    if (!card.input_shape || card.input_shape === 'Not specified') unmetRules.push('Missing documented input schema.');
    if (!hasLatencyMetric(evidence)) unmetRules.push('Missing measured latency evidence.');
  }

  const isPassed = unmetRules.length === 0;
  return {
    policy,
    isPassed,
    scoreDelta: currentScore - policy.min_score,
    unmetRules,
    statusText: isPassed ? 'POLICY_PASSED' : 'POLICY_BLOCKED',
    justification: isPassed
      ? `The saved evidence satisfies the internal ${policy.name} rules.`
      : `The saved evidence does not satisfy ${policy.name} (${unmetRules.length} unmet rule${unmetRules.length === 1 ? '' : 's'}).`,
  };
}
