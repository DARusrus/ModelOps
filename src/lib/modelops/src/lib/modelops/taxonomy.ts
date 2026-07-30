/**
 * Domain Taxonomy for ModelOps
 * Owner: Zein ElDin Mohamed Farouk
 *
 * This file defines, in plain terms, what "complete" and "ready" mean
 * for a model card. These definitions are used by readiness_score()
 * and compare_runs() in tools.ts, and must stay in sync with them.
 */

// --- Documentation completeness ---
// A model card is considered "documented" only if ALL of these are present:
export const REQUIRED_FIELDS = [
  'model_name',
  'version',
  'dataset',
  'metrics',
  'intended_use',
  'limitations',
  'risks',
  'tests',
  'reproducibility',
] as const;

// --- Test coverage rules ---
// A model card is considered "tested" if it lists at least one
// recognized test type. Add more as the team agrees on them.
export const RECOGNIZED_TEST_TYPES = [
  'unit test',
  'integration test',
  'bias/fairness test',
  'performance/regression test',
  'security test',
];

// --- Risk severity levels ---
// Used to decide whether a risk is "known/acceptable" or "blocking."
export type RiskSeverity = 'low' | 'medium' | 'high' | 'blocking';

export const RISK_SEVERITY_RULES: Record<RiskSeverity, string> = {
  low: 'Minor limitation, does not affect core use case.',
  medium: 'Notable limitation, should be disclosed to users.',
  high: 'Significant risk, requires mitigation plan before release.',
  blocking: 'Unacceptable risk — release must be rejected until resolved.',
};

// --- Readiness bands ---
// Used to translate a numeric score into a human decision category.
export const READINESS_BANDS = [
  { min: 90, label: 'Ready for release' },
  { min: 70, label: 'Ready with reservations — human review required' },
  { min: 50, label: 'Not ready — major gaps present' },
  { min: 0, label: 'Not ready — critical information missing' },
];
