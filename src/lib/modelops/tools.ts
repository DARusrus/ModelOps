import { REQUIRED_FIELDS, READINESS_BANDS } from './taxonomy';
import { READINESS_SCORE_RULES } from './tool-rules';
import type { ModelCardOutput } from './schema';

/**
 * readiness_score()
 * Deterministic scoring — NOT AI generated.
 * Same input always produces the same output.
 * Rules implemented here must match src/lib/modelops/tool-rules.ts exactly.
 */
export function readiness_score(data: Partial<ModelCardOutput>): number {
  let score = 100;
  const reasons: string[] = [];

  if (!data.limitations || data.limitations.length === 0) {
    score -= 30;
    reasons.push('Missing limitations (-30)');
  }

  if (!data.tests || data.tests.length === 0) {
    score -= 30;
    reasons.push('Missing tests (-30)');
  }

  if (!data.risks || data.risks.length === 0) {
    score -= 20;
    reasons.push('Missing risks (-20)');
  }

  if (!data.reproducibility || data.reproducibility.trim() === '') {
    score -= 20;
    reasons.push('Missing reproducibility steps (-20)');
  }

  // Never go below 0
  score = Math.max(0, score);

  return score;
}

/**
 * readiness_label()
 * Turns a numeric score into a human-readable decision band,
 * using the bands defined in taxonomy.ts.
 */
export function readiness_label(score: number): string {
  const band = READINESS_BANDS
    .slice()
    .sort((a, b) => b.min - a.min)
    .find((b) => score >= b.min);
  return band ? band.label : 'Unknown';
}

/**
 * readiness_gaps()
 * Returns the specific missing fields, so the app can show
 * "here's exactly what's missing" instead of just a number.
 */
export function readiness_gaps(data: Partial<ModelCardOutput>): string[] {
  const gaps: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    const value = (data as any)[field];
    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);
    if (isEmpty) {
      gaps.push(field);
    }
  }
  return gaps;
}

/**
 * compare_runs()
 * Deterministic comparison of two model card records.
 * Never guesses a missing value — marks it "not comparable" instead.
 */
export function compare_runs(run1: Partial<ModelCardOutput>, run2: Partial<ModelCardOutput>) {
  const metricComparison: Record<string, any> = {};

  const metrics1 = run1.metrics || {};
  const metrics2 = run2.metrics || {};
  const allMetricKeys = new Set([...Object.keys(metrics1), ...Object.keys(metrics2)]);

  // Metrics where a LOWER number is better (everything else assumes higher = better)
  const lowerIsBetter = ['loss', 'error_rate', 'error', 'mse', 'rmse'];

  for (const key of allMetricKeys) {
    const v1 = metrics1[key];
    const v2 = metrics2[key];

    if (v1 === undefined || v2 === undefined) {
      metricComparison[key] = { run1: v1 ?? 'missing', run2: v2 ?? 'missing', winner: 'not comparable' };
      continue;
    }

    const preferLower = lowerIsBetter.includes(key.toLowerCase());
    let winner: 'run1' | 'run2' | 'tie';
    if (v1 === v2) winner = 'tie';
    else if (preferLower) winner = v1 < v2 ? 'run1' : 'run2';
    else winner = v1 > v2 ? 'run1' : 'run2';

    metricComparison[key] = { run1: v1, run2: v2, winner };
  }

  const gaps1 = readiness_gaps(run1);
  const gaps2 = readiness_gaps(run2);

  return {
    metricComparison,
    readiness: {
      run1: { score: readiness_score(run1), gaps: gaps1 },
      run2: { score: readiness_score(run2), gaps: gaps2 },
    },
  };
}
