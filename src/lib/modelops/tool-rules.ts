/**
 * Deterministic Tool Rules for ModelOps
 * Owner: Zein ElDin Mohamed Farouk
 *
 * Documents exactly how readiness_score_detail() and compare_runs()
 * behave in src/lib/modelops/tools.ts. This file does not implement
 * logic — it explains the logic that's already implemented, so the
 * whole team has one place to check "why did this score come out
 * this way."
 */

export const READINESS_SCORE_FORMULA =
  'Current cards use the versioned structured evidence rubric (10 + 15 + 25 + 25 + 25). ' +
  'Unversioned legacy fixtures retain the historical completeness formula.';

export const COMPARE_RUNS_RULES = [
  {
    rule: 'Metric direction',
    behavior:
      'metric-registry.ts supplies explicit directions and recognized names/suffixes. ' +
      'Unknown directions are not labelled improvements. Structured evidence must be comparable.',
  },
  {
    rule: 'Readiness delta',
    behavior: 'Saved scores are retained. Same-rubric delta is score2 - score1; different rubrics yield null.',
  },
  {
    rule: 'Missing metrics',
    behavior:
      'If a metric exists in only one run, the missing side is returned as null ' +
      'with status "not_measured". No numeric delta or direction is inferred.',
  },
];

export const KNOWN_QUALITY_FINDINGS: readonly [] = [];
