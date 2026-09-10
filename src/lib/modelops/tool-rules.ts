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
  'total = identification(max 10) + dataset(max 15) + metrics(max 25) ' +
  '+ governance(max 25) + testing(max 25), clamped between 0 and 100';

export const COMPARE_RUNS_RULES = [
  {
    rule: 'Metric direction',
    behavior:
      'A metric is treated as "lower is better" only if its key name contains ' +
      '"loss" or "error" (case-insensitive). All other metrics assume higher is better.',
  },
  {
    rule: 'Readiness delta',
    behavior: 'readiness_delta = readiness_score(run2) - readiness_score(run1).',
  },
  {
    rule: 'Missing metrics',
    behavior:
      'If a metric exists in only one run, the missing side is returned as null ' +
      'with status "not_measured". No numeric delta or direction is inferred.',
  },
];

export const KNOWN_QUALITY_FINDINGS: readonly [] = [];
