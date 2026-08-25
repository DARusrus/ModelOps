import {
  ReadinessScoreResult,
  CompareRunsOutput,
  MetricDiff,
  ToolRuleViolation,
} from '@/types';

/**
 * Calculates a deterministic model readiness score (0-100) based on documentation completeness.
 */
export function readiness_score(data: any): number {
  return readiness_score_detail(data).score;
}

/**
 * Detailed readiness score calculation returning breakdown and justifications.
 */
export function readiness_score_detail(data: any): ReadinessScoreResult {
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

  const justifications: ReadinessScoreResult['justification'] = [];
  const breakdown: Record<string, number> = {};

  // 1. Model Identification (Max 10 pts)
  const hasName = Boolean(data.model_name && String(data.model_name).trim().length > 0);
  const hasVersion = Boolean(data.version && String(data.version).trim().length > 0);
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
  const hasDataset = Boolean(data.dataset && String(data.dataset).trim().length > 0);
  const hasInputShape = Boolean(
    (data.input_shape && data.input_shape !== 'Not specified') ||
    data.data_split ||
    data.eval_preprocessing
  );
  const hasDataTypes = Boolean(
    (Array.isArray(data.data_types) && data.data_types.length > 0) ||
    data.training_dataset ||
    data.data_volume
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
  const metricsCount = data.metrics ? Object.keys(data.metrics).length : 0;
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
  const limitationsCount = Array.isArray(data.limitations)
    ? data.limitations.length
    : typeof data.limitations === 'string' && data.limitations.trim().length > 0
    ? 1
    : 0;

  const risksCount = Array.isArray(data.risks)
    ? data.risks.length
    : typeof data.risks === 'string' && data.risks.trim().length > 0
    ? 1
    : data.risks_and_harms && String(data.risks_and_harms).trim().length > 0
    ? 1
    : 0;

  const warningsCount = Array.isArray(data.warnings)
    ? data.warnings.length
    : typeof data.warnings === 'string' && data.warnings.trim().length > 0
    ? 1
    : data.mitigations && String(data.mitigations).trim().length > 0
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
  const testsCount = Array.isArray(data.tests)
    ? data.tests.length
    : typeof data.tests === 'string' && data.tests.trim().length > 0
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
    data.reproducibility &&
    typeof data.reproducibility === 'string' &&
    data.reproducibility.trim().length > 0 &&
    !reproducibilityDefaults.includes(data.reproducibility.trim())
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
  run1: any,
  run2: any
): CompareRunsOutput {
  const name1 = run1?.model_name || 'Run 1';
  const ver1 = run1?.version || '1.0.0';
  const name2 = run2?.model_name || 'Run 2';
  const ver2 = run2?.version || '2.0.0';

  const metrics1 = run1?.metrics || {};
  const metrics2 = run2?.metrics || {};
  const allMetricKeys = Array.from(new Set([...Object.keys(metrics1), ...Object.keys(metrics2)]));

  const metricsDiff: MetricDiff[] = allMetricKeys.map((key) => {
    const val1 = metrics1[key] ?? 0;
    const val2 = metrics2[key] ?? 0;
    const delta = val2 - val1;

    // For metrics like loss or error, lower is better. Default: higher is better unless key contains 'loss' or 'error'
    const lowerIsBetter = key.toLowerCase().includes('loss') || key.toLowerCase().includes('error');
    let direction: 'improved' | 'degraded' | 'unchanged' = 'unchanged';

    if (delta !== 0) {
      if (lowerIsBetter) {
        direction = delta < 0 ? 'improved' : 'degraded';
      } else {
        direction = delta > 0 ? 'improved' : 'degraded';
      }
    }

    return {
      metric_name: key,
      run1_value: val1,
      run2_value: val2,
      delta: Number(delta.toFixed(4)),
      direction,
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
export function check_rules(card: any): ToolRuleViolation[] {
  const violations: ToolRuleViolation[] = [];

  if (!card?.model_name) {
    violations.push({
      rule: 'model_name_required',
      severity: 'error',
      message: 'Model name is required for all model cards.',
    });
  }

  if (!card?.version) {
    violations.push({
      rule: 'version_required',
      severity: 'error',
      message: 'Model version is required.',
    });
  }

  if (!card?.metrics || Object.keys(card.metrics).length === 0) {
    violations.push({
      rule: 'metrics_required',
      severity: 'warning',
      message: 'At least one quantitative evaluation metric should be provided.',
    });
  }

  if (!card?.intended_use) {
    violations.push({
      rule: 'intended_use_required',
      severity: 'warning',
      message: 'Intended use description is recommended for governance transparency.',
    });
  }

  return violations;
}