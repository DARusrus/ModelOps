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
      'If a metric exists in only one run, the missing side is treated as 0 ' +
      '(see val1 = metrics1[key] ?? 0). This is a KNOWN QUALITY CONCERN — see note below.',
  },
];

/**
 * QUALITY FINDING — flagged by Zein, for team discussion.
 *
 * compare_runs() currently defaults a missing metric to 0 instead of marking it
 * "not comparable." Example: if run1 never measured "f1_score" but run2 reports
 * 0.95, the diff will show a jump from 0 → 0.95 and label it "improved" — which
 * is misleading. It looks like a real improvement, but it may just be a metric
 * that was never measured in run1 at all.
 *
 * This does not violate the "never fabricate data" rule directly (0 isn't an
 * invented number, it's a default), but it can produce a misleading summary
 * sentence, which has the same practical effect: a human reading it could
 * believe something was proven true that wasn't actually measured.
 *
 * Suggested fix (for discussion with the backend engineer, not implemented
 * here since tools.ts is their owned file): when a metric is missing from one
 * run, mark that specific diff entry as "not_measured" instead of computing
 * a numeric delta against 0.
 */
export const KNOWN_QUALITY_FINDINGS = [
  {
    id: 'finding-01',
    area: 'compare_runs',
    issue: 'Missing metrics default to 0 instead of being marked as not measured, which can produce misleading "improved" labels.',
    severity: 'medium',
    status: 'flagged for team discussion — not yet fixed',
  },
];
