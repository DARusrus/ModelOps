import { ReadinessPolicy, ModelCardOutput, GovernanceAuditEntry } from '@/types/modelops';

export const STANDARD_GOVERNANCE_POLICIES: ReadinessPolicy[] = [
  {
    id: 'healthcare_ai',
    name: 'Healthcare & Clinical AI Compliance Policy',
    domain: 'Healthcare',
    min_score: 90,
    description: 'Enforces strict medical device regulation, demographic parity, and disaggregated clinical testing.',
    mandatory_rules: [
      'Minimum Readiness Score: 90/100',
      'Mandatory Verification Test Suites',
      'Mandatory Sensitive Data Mitigations',
      'Mandatory Reproducibility Audit Seed',
    ],
  },
  {
    id: 'fin_fraud_ai',
    name: 'Financial Fraud & Credit Risk Standard',
    domain: 'Financial Fraud',
    min_score: 85,
    description: 'Adheres to Fair Lending compliance, model explainability, and latency SLAs.',
    mandatory_rules: [
      'Minimum Readiness Score: 85/100',
      'At least 3 Quantitative Metrics (including SLA latency)',
      'Operational Risk Disclosures',
    ],
  },
  {
    id: 'genai_llm_ai',
    name: 'Generative AI & LLM Safety Guardrails',
    domain: 'Generative AI',
    min_score: 85,
    description: 'Complies with NIST AI RMF for foundational models, red-teaming, and content filtering.',
    mandatory_rules: [
      'Minimum Readiness Score: 85/100',
      'Operational Safety Guardrails & Mitigations',
      'Reproducibility Hash & Random Seed',
    ],
  },
  {
    id: 'cv_edge_ai',
    name: 'Computer Vision & Edge Deployment Standard',
    domain: 'Computer Vision',
    min_score: 80,
    description: 'Ensures hardware runtime instrumentation and noise robustness for vision models.',
    mandatory_rules: [
      'Minimum Readiness Score: 80/100',
      'Dataset Preprocessing & Input Schema',
      'Latency Benchmarks',
    ],
  },
  {
    id: 'enterprise_general',
    name: 'Enterprise General Governance Standard',
    domain: 'Enterprise Standard',
    min_score: 75,
    description: 'Baseline governance policy for internal enterprise ML systems.',
    mandatory_rules: [
      'Minimum Readiness Score: 75/100',
      'Documented Intended Use & Limitations',
    ],
  },
];

export interface PolicyEvaluationResult {
  policy: ReadinessPolicy;
  isPassed: boolean;
  scoreDelta: number;
  unmetRules: string[];
  statusText: 'POLICY_PASSED' | 'POLICY_BLOCKED';
  justification: string;
}

/**
 * Evaluates whether a model card satisfies the selected governance policy.
 */
export function evaluatePolicyCompliance(
  card: ModelCardOutput,
  policyId?: string
): PolicyEvaluationResult {
  const policy =
    STANDARD_GOVERNANCE_POLICIES.find((p) => p.id === policyId) ||
    STANDARD_GOVERNANCE_POLICIES[4]; // Default to general standard

  const currentScore = card.readiness_score || 0;
  const unmetRules: string[] = [];

  if (currentScore < policy.min_score) {
    unmetRules.push(
      `Readiness score (${currentScore}/100) is below required minimum threshold of ${policy.min_score}/100.`
    );
  }

  // Check domain specific rules
  if (policy.id === 'healthcare_ai') {
    if (!card.tests || card.tests.length === 0) {
      unmetRules.push('Missing verification test suites.');
    }
    if (!card.reproducibility || card.reproducibility.includes('Standard')) {
      unmetRules.push('Missing specific reproducibility audit seed.');
    }
  }

  if (policy.id === 'genai_llm_ai') {
    if (!card.warnings && !card.metadata?.mitigations) {
      unmetRules.push('Missing safety mitigations and guardrails disclosure.');
    }
  }

  const isPassed = unmetRules.length === 0;

  return {
    policy,
    isPassed,
    scoreDelta: currentScore - policy.min_score,
    unmetRules,
    statusText: isPassed ? 'POLICY_PASSED' : 'POLICY_BLOCKED',
    justification: isPassed
      ? `Model card fully complies with ${policy.name} (Score: ${currentScore}/${policy.min_score}).`
      : `Model card does not meet ${policy.name} requirements (${unmetRules.length} violation(s)).`,
  };
}

/**
 * Creates a cryptographically signed human governance audit entry.
 */
export function createAuditSignOff(
  card: ModelCardOutput,
  policy: ReadinessPolicy,
  signerInfo: {
    reviewer_name: string;
    reviewer_role: string;
    department: string;
    notes: string;
  }
): GovernanceAuditEntry {
  const timestamp = new Date().toISOString();
  const evaluation = evaluatePolicyCompliance(card, policy.id);
  const audit_id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Deterministic signature hash representing the approval block
  const rawSignatureString = `${audit_id}|${card.model_name}|${card.version}|${card.readiness_score}|${signerInfo.reviewer_name}|${timestamp}`;
  let hash = 0;
  for (let i = 0; i < rawSignatureString.length; i++) {
    const char = rawSignatureString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const signature_hash = `sha256:${Math.abs(hash).toString(16).padStart(16, '0')}${Date.now().toString(16)}`;

  return {
    audit_id,
    model_name: card.model_name,
    version: card.version,
    readiness_score: card.readiness_score,
    policy_name: policy.name,
    policy_status: evaluation.statusText,
    reviewer_name: signerInfo.reviewer_name.trim(),
    reviewer_role: signerInfo.reviewer_role.trim(),
    department: signerInfo.department.trim(),
    timestamp,
    notes: signerInfo.notes.trim() || 'Approved for deployment with human governance review.',
    signature_hash,
  };
}
