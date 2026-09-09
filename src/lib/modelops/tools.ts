import {
  ReadinessScoreResult,
  CompareRunsOutput,
  MetricDiff,
  ToolRuleViolation,
} from '@/types';
import { metricDirection } from '@/domain/modelops/metric-registry';
import { EvidenceItem } from '@/domain/modelops/evidence';

type EvaluationRecord = Record<string, unknown> & {
  model_name?: string; version?: string; dataset?: string; metrics?: Record<string, number>;
  input_shape?: string; data_types?: string[]; limitations?: string[] | string; risks?: string[] | string;
  warnings?: string[] | string; tests?: string[] | string; reproducibility?: string; intended_use?: string;
  evidence_items?: EvidenceItem[];
};

function asEvaluationRecord(value: unknown): EvaluationRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as EvaluationRecord : {};
}

/**
 * Calculates a deterministic model readiness score (0-100) based on documentation completeness.
 */
export function readiness_score(data: unknown): number {
  return readiness_score_detail(data).score;
}

/**
 * Detailed readiness score calculation returning breakdown and justifications.
 */
export function readiness_score_detail(data: unknown): ReadinessScoreResult {
  if (!data || typeof data !== 'object') {
    return {
      score: 0,
      breakdown: {
        identification: 0,
        dataset: 0,
        metrics: 0,
        governance: 0,
        testing: 0,
      },
      justification: [
        {
          criteria: 'Empty',
          points: 0,
          max_points: 100,
          passed: false,
          reason: 'No valid data provided',
        },
      ],
    };
  }

  const record = asEvaluationRecord(data);
  const justifications: ReadinessScoreResult['justification'] = [];
  const breakdown: Record<string, number> = {};

  // 1. Model Identification (Max 10 pts)
  const hasName = Boolean(record.model_name && String(record.model_name).trim().length > 0);
  const hasVersion = Boolean(record.version && String(record.version).trim().length > 0);
  const idPoints = (hasName ? 5 : 0) + (hasVersion ? 5 : 0);
  breakdown['identification'] = idPoints;
  justifications.push({
    criteria: 'Model Identification',
    points: idPoints,
    max_points: 10,
    passed: idPoints === 10,
    reason: idPoints === 10 ? 'Model name and version are clearly specified.' : 'Missing model name or version.',
  });

  // 2. Dataset Documentation (Max 15 pts)
  const hasDataset = Boolean(record.dataset && String(record.dataset).trim().length > 0);
  const hasInputShape = Boolean(
    (record.input_shape && record.input_shape !== 'Not specified') || record.data_split || record.eval_preprocessing
  );
  const hasDataTypes = Boolean(
    (Array.isArray(record.data_types) && record.data_types.length > 0) || record.training_dataset || record.data_volume
  );
  const datasetPoints = (hasDataset ? 7 : 0) + (hasInputShape ? 4 : 0) + (hasDataTypes ? 4 : 0);
  breakdown['dataset'] = datasetPoints;
  justifications.push({
    criteria: 'Dataset & Input Schema',
    points: datasetPoints,
    max_points: 15,
    passed: datasetPoints >= 11,
    reason: `Dataset documented (${hasDataset ? 'Yes' : 'No'}), Input shape (${hasInputShape ? 'Yes' : 'No'}), Data types (${hasDataTypes ? 'Yes' : 'No'}).`,
  });

  // 3. Quantitative Evaluation Metrics (Max 25 pts)
  const metricsCount = record.metrics ? Object.keys(record.metrics).length : 0;
  let metricsPoints = 0;
  if (metricsCount >= 3) metricsPoints = 25;
  else if (metricsCount === 2) metricsPoints = 18;
  else if (metricsCount === 1) metricsPoints = 10;
  breakdown['metrics'] = metricsPoints;
  justifications.push({
    criteria: 'Evaluation Metrics',
    points: metricsPoints,
    max_points: 25,
    passed: metricsPoints >= 18,
    reason: `Found ${metricsCount} evaluation metrics.`,
  });

  // 4. Governance & Risk Management (Max 25 pts)
  const limitationsCount = Array.isArray(record.limitations)
    ? record.limitations.length
    : typeof record.limitations === 'string' && record.limitations.trim().length > 0
    ? 1
    : 0;

  const risksCount = Array.isArray(record.risks)
    ? record.risks.length
    : typeof record.risks === 'string' && record.risks.trim().length > 0
    ? 1
    : record.risks_and_harms && String(record.risks_and_harms).trim().length > 0
    ? 1
    : 0;

  const warningsCount = Array.isArray(record.warnings)
    ? record.warnings.length
    : typeof record.warnings === 'string' && record.warnings.trim().length > 0
    ? 1
    : record.mitigations && String(record.mitigations).trim().length > 0
    ? 1
    : 0;

  const govPoints = Math.min(25, (limitationsCount > 0 ? 10 : 0) + (risksCount > 0 ? 10 : 0) + (warningsCount > 0 ? 5 : 0));
  breakdown['governance'] = govPoints;
  justifications.push({
    criteria: 'Governance, Risks & Limitations',
    points: govPoints,
    max_points: 25,
    passed: govPoints >= 20,
    reason: `Documented ${limitationsCount} limitations, ${risksCount} risks, and ${warningsCount} warnings/mitigations.`,
  });

  // 5. Verification & Testing (Max 25 pts)
  const testsCount = Array.isArray(record.tests)
    ? record.tests.length
    : typeof record.tests === 'string' && record.tests.trim().length > 0
    ? 1
    : 0;

  const reproducibilityDefaults = [
    'Standard execution pipeline',
    'Standard pipeline execution',
    'default',
    'none',
    'n/a',
  ];
  const hasReproducibility = Boolean(
    record.reproducibility && typeof record.reproducibility === 'string' && record.reproducibility.trim().length > 0 && !reproducibilityDefaults.includes(record.reproducibility.trim())
  );
  const testPoints = Math.min(25, (testsCount > 0 ? 15 : 0) + (hasReproducibility ? 10 : 0));
  breakdown['testing'] = testPoints;
  justifications.push({
    criteria: 'Testing & Reproducibility',
    points: testPoints,
    max_points: 25,
    passed: testPoints >= 15,
    reason: `Executed ${testsCount} test suites. Reproducibility documented: ${hasReproducibility ? 'Yes' : 'No'}.`,
  });

  const totalScore = Math.min(100, Math.max(0, idPoints + datasetPoints + metricsPoints + govPoints + testPoints));

  return {
    score: totalScore,
    justification: justifications,
    breakdown,
  };
}

/**
 * Deterministically compares two experiment runs and returns structured diffs.
 */
export function compare_runs(
  run1: unknown,
  run2: unknown
): CompareRunsOutput {
  const firstRun = asEvaluationRecord(run1);
  const secondRun = asEvaluationRecord(run2);
  const name1 = firstRun.model_name || 'Run 1';
  const ver1 = firstRun.version || '1.0.0';
  const name2 = secondRun.model_name || 'Run 2';
  const ver2 = secondRun.version || '2.0.0';

  const metrics1 = firstRun.metrics || {};
  const metrics2 = secondRun.metrics || {};
  const allMetricKeys = Array.from(new Set([...Object.keys(metrics1), ...Object.keys(metrics2)]));
  const evidence1 = Array.isArray(firstRun.evidence_items) ? firstRun.evidence_items : [];
  const evidence2 = Array.isArray(secondRun.evidence_items) ? secondRun.evidence_items : [];
  const usesStructuredEvidence = evidence1.length > 0 || evidence2.length > 0;
  const metricEvidence = (evidence: EvidenceItem[], key: string) => evidence.find((item) => item.kind === 'metric' && item.label.trim().toLowerCase() === key.trim().toLowerCase());

  const metricsDiff: MetricDiff[] = allMetricKeys.map((key) => {
    const val1 = metrics1[key];
    const val2 = metrics2[key];
    if (typeof val1 !== 'number' || typeof val2 !== 'number') {
      return {
        metric_name: key,
        run1_value: val1 ?? Number.NaN,
        run2_value: val2 ?? Number.NaN,
        delta: Number.NaN,
        direction: 'unchanged',
        comparison_status: 'not_measured',
        reason: 'The metric was not measured in both runs.',
      };
    }
    const evidenceForRun1 = metricEvidence(evidence1, key);
    const evidenceForRun2 = metricEvidence(evidence2, key);
    if (usesStructuredEvidence) {
      if (firstRun.dataset !== secondRun.dataset) return { metric_name: key, run1_value: val1, run2_value: val2, delta: Number.NaN, direction: 'unchanged', comparison_status: 'different_dataset', reason: 'The runs use different evaluation datasets.' };
      if (!evidenceForRun1 || !evidenceForRun2 || !evidenceForRun1.attributes?.unit || !evidenceForRun2.attributes?.unit || !evidenceForRun1.reference || !evidenceForRun2.reference) return { metric_name: key, run1_value: val1, run2_value: val2, delta: Number.NaN, direction: 'unchanged', comparison_status: 'not_comparable', reason: 'Both runs need metric evidence with a unit and source reference.' };
      if (evidenceForRun1.attributes.unit !== evidenceForRun2.attributes.unit) return { metric_name: key, run1_value: val1, run2_value: val2, delta: Number.NaN, direction: 'unchanged', comparison_status: 'incompatible_unit', reason: `Metric units differ (${evidenceForRun1.attributes.unit} vs ${evidenceForRun2.attributes.unit}).` };
    }
    const delta = val2 - val1;
    const directionDefinition = metricDirection(key);
    let direction: 'improved' | 'degraded' | 'unchanged' = 'unchanged';

    if (delta !== 0) {
      if (directionDefinition === 'lower_is_better') {
        direction = delta < 0 ? 'improved' : 'degraded';
      } else if (directionDefinition === 'higher_is_better') {
        direction = delta > 0 ? 'improved' : 'degraded';
      }
    }

    return {
      metric_name: key,
      run1_value: val1,
      run2_value: val2,
      delta: Number(delta.toFixed(4)),
      direction,
      comparison_status: 'comparable',
      unit: evidenceForRun1?.attributes?.unit,
    };
  });

  const score1 = readiness_score(run1);
  const score2 = readiness_score(run2);
  const readinessDelta = score2 - score1;

  const summary: string[] = [];
  if (readinessDelta > 0) {
    summary.push(`${name2} (v${ver2}) has a higher readiness score (+${readinessDelta} points) than ${name1} (v${ver1}).`);
  } else if (readinessDelta < 0) {
    summary.push(`${name1} (v${ver1}) has a higher readiness score (+${Math.abs(readinessDelta)} points) than ${name2} (v${ver2}).`);
  } else {
    summary.push(`Both runs have equal overall readiness scores (${score1}/100).`);
  }

  const improvedMetrics = metricsDiff.filter((m) => m.direction === 'improved').map((m) => m.metric_name);
  const degradedMetrics = metricsDiff.filter((m) => m.direction === 'degraded').map((m) => m.metric_name);

  if (improvedMetrics.length > 0) {
    summary.push(`Improved metrics in ${name2}: ${improvedMetrics.join(', ')}.`);
  }
  if (degradedMetrics.length > 0) {
    summary.push(`Degraded metrics in ${name2}: ${degradedMetrics.join(', ')}.`);
  }

  return {
    model_name_1: name1,
    version_1: ver1,
    model_name_2: name2,
    version_2: ver2,
    metrics_diff: metricsDiff,
    readiness_score_1: score1,
    readiness_score_2: score2,
    readiness_delta: readinessDelta,
    summary,
  };
}

/**
 * Validates tool rule compliance.
 */
export function check_rules(card: unknown): ToolRuleViolation[] {
  const record = asEvaluationRecord(card);
  const violations: ToolRuleViolation[] = [];

  if (!record.model_name) {
    violations.push({
      rule: 'model_name_required',
      severity: 'error',
      message: 'Model name is required for all model cards.',
    });
  }

  if (!record.version) {
    violations.push({
      rule: 'version_required',
      severity: 'error',
      message: 'Model version is required.',
    });
  }

  if (!record.metrics || Object.keys(record.metrics).length === 0) {
    violations.push({
      rule: 'metrics_required',
      severity: 'warning',
      message: 'At least one quantitative evaluation metric should be provided.',
    });
  }

  if (!record.intended_use) {
    violations.push({
      rule: 'intended_use_required',
      severity: 'warning',
      message: 'Intended use description is recommended for governance transparency.',
    });
  }

  return violations;
}
