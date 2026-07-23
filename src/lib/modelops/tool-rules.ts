/**
 * Deterministic Tool Rules for ModelOps
 * Owner: Zein ElDin Mohamed Farouk
 *
 * These are the exact, human-readable rules that readiness_score()
 * and compare_runs() in tools.ts must implement in code.
 * Every rule here must be traceable to a real, checkable reason —
 * not an arbitrary number.
 */

export const READINESS_SCORE_RULES = [
  {
    rule: 'Missing `limitations`',
    penalty: -30,
    reason: 'Undocumented limitations are a direct release risk.',
  },
  {
    rule: 'Missing `tests` (empty array)',
    penalty: -30,
    reason: 'No evidence the model was validated before release.',
  },
  {
    rule: 'Missing `risks` (empty array)',
    penalty: -20,
    reason: 'Undocumented risks cannot be reviewed by a human.',
  },
  {
    rule: 'Missing `reproducibility` steps',
    penalty: -20,
    reason: 'Cannot be independently verified without reproduction steps.',
  },
];

export const COMPARE_RUNS_RULES = [
  {
    rule: 'Compare numeric metrics field by field',
    behavior: 'Higher is better for accuracy/precision/recall/F1; lower is better for loss/error rate.',
  },
  {
    rule: 'Compare documentation completeness',
    behavior: 'Count how many REQUIRED_FIELDS (see taxonomy.ts) are non-empty for each run.',
  },
  {
    rule: 'Flag missing metrics instead of guessing',
    behavior: 'If a metric exists in one run but not the other, mark it "not comparable", never estimate it.',
  },
];
