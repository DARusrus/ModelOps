import { ModelCardOutput, ModelOpsInput, SimulatedGapItem } from '@/types/modelops';
import { readiness_score } from './tools';

/**
 * Discovers potential gap items and prospective point values for a model card.
 */
export function identifyModelGaps(card: ModelCardOutput | ModelOpsInput): SimulatedGapItem[] {
  const gaps: SimulatedGapItem[] = [];

  // 1. Identification
  const hasName = Boolean(card.model_name && String(card.model_name).trim().length > 0);
  const hasVersion = Boolean(card.version && String(card.version).trim().length > 0);
  if (!hasName) {
    gaps.push({
      id: 'gap_name',
      category: 'identification',
      label: 'Model Name Specification',
      description: 'Define clear alphanumeric model designation and release identifier.',
      point_value: 5,
      is_missing: true,
      field_key: 'model_name',
      suggested_value: 'Enterprise-ML-Candidate',
    });
  }
  if (!hasVersion) {
    gaps.push({
      id: 'gap_version',
      category: 'identification',
      label: 'Semantic Version Number',
      description: 'Document semantic versioning (e.g. 1.0.0, 2.1.0).',
      point_value: 5,
      is_missing: true,
      field_key: 'version',
      suggested_value: '1.0.0',
    });
  }

  // 2. Dataset
  const rawCard = card as any;
  const meta = ('metadata' in card && card.metadata) ? (card.metadata as any) : {};

  const hasDataset = Boolean(card.dataset && String(card.dataset).trim().length > 0);
  const hasInputShape = Boolean(
    (card.input_shape && card.input_shape !== 'Not specified') ||
    rawCard.data_split ||
    meta.data_split ||
    rawCard.eval_preprocessing ||
    meta.eval_preprocessing
  );
  const hasDataTypes = Boolean(
    (Array.isArray(card.data_types) && card.data_types.length > 0) ||
    rawCard.training_dataset ||
    meta.training_dataset ||
    rawCard.data_volume ||
    meta.data_volume
  );

  if (!hasDataset) {
    gaps.push({
      id: 'gap_dataset',
      category: 'dataset',
      label: 'Evaluation Benchmark Dataset',
      description: 'Document benchmark test dataset name and provenance.',
      point_value: 7,
      is_missing: true,
      field_key: 'dataset',
      suggested_value: 'Standard-Evaluation-Benchmark-v2',
    });
  }
  if (!hasInputShape) {
    gaps.push({
      id: 'gap_input_shape',
      category: 'dataset',
      label: 'Data Split & Preprocessing Pipeline',
      description: 'Document train/val/test splits and tokenization/normalization steps.',
      point_value: 4,
      is_missing: true,
      field_key: 'eval_preprocessing',
      suggested_value: 'UTF-8 normalization, lowercasing, 80/10/10 split',
    });
  }
  if (!hasDataTypes) {
    gaps.push({
      id: 'gap_data_types',
      category: 'dataset',
      label: 'Training Corpus & Feature Types',
      description: 'Specify training dataset scale and tensor data types.',
      point_value: 4,
      is_missing: true,
      field_key: 'training_dataset',
      suggested_value: 'Curated Domain Corpus (2.4M tokens / float32 features)',
    });
  }

  // 3. Metrics
  const metricsCount = card.metrics ? Object.keys(card.metrics).length : 0;
  if (metricsCount < 3) {
    gaps.push({
      id: 'gap_metrics_3',
      category: 'metrics',
      label: 'Third Quantitative Performance Metric',
      description: 'Add complementary SLA or safety metric (e.g. Latency ms, F1 Score, AUC-ROC).',
      point_value: metricsCount === 2 ? 7 : metricsCount === 1 ? 15 : 25,
      is_missing: true,
      field_key: 'metrics',
      suggested_value: { latency_ms: 14.5, f1_score: 0.91, accuracy: 0.94 },
    });
  }

  // 4. Governance & Risks
  const limitationsCount = Array.isArray(card.limitations)
    ? card.limitations.length
    : typeof card.limitations === 'string' && card.limitations.trim().length > 0
    ? 1
    : 0;
  const risksCount = Array.isArray(card.risks)
    ? card.risks.length
    : typeof card.risks === 'string' && card.risks.trim().length > 0
    ? 1
    : (rawCard.risks_and_harms || meta.risks_and_harms) && String(rawCard.risks_and_harms || meta.risks_and_harms).trim().length > 0
    ? 1
    : 0;
  const warningsCount = Array.isArray(card.warnings)
    ? card.warnings.length
    : typeof card.warnings === 'string' && card.warnings.trim().length > 0
    ? 1
    : (rawCard.mitigations || meta.mitigations) && String(rawCard.mitigations || meta.mitigations).trim().length > 0
    ? 1
    : 0;

  if (limitationsCount === 0) {
    gaps.push({
      id: 'gap_limitations',
      category: 'governance',
      label: 'Operational Limitations & Boundaries',
      description: 'Document edge cases, sensor noise, or domain shifts where model performance degrades.',
      point_value: 10,
      is_missing: true,
      field_key: 'limitations',
      suggested_value: ['Performance degrades under low-light sensor conditions or out-of-vocabulary terms.'],
    });
  }
  if (risksCount === 0) {
    gaps.push({
      id: 'gap_risks',
      category: 'governance',
      label: 'Operational Risks & Failure Modes',
      description: 'Disclose potential failure modes, demographic bias, or misclassification risks.',
      point_value: 10,
      is_missing: true,
      field_key: 'risks',
      suggested_value: ['Risk of false negatives on edge demographic cohorts without human audit.'],
    });
  }
  if (warningsCount === 0) {
    gaps.push({
      id: 'gap_warnings',
      category: 'governance',
      label: 'Safety Mitigations & Ethical Guardrails',
      description: 'Define technical safeguards, confidence thresholds, and human escalation procedures.',
      point_value: 5,
      is_missing: true,
      field_key: 'mitigations',
      suggested_value: ['Confidence score threshold >= 0.85 required; human-in-the-loop fallback for low scores.'],
    });
  }

  // 5. Testing & Reproducibility
  const testsCount = Array.isArray(card.tests)
    ? card.tests.length
    : typeof card.tests === 'string' && card.tests.trim().length > 0
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
    card.reproducibility &&
    typeof card.reproducibility === 'string' &&
    card.reproducibility.trim().length > 0 &&
    !reproducibilityDefaults.includes(card.reproducibility.trim())
  );

  if (testsCount === 0) {
    gaps.push({
      id: 'gap_tests',
      category: 'testing',
      label: 'Verification Test Suites',
      description: 'Execute and document test suites (e.g. 5-Fold Cross Validation, Latency SLA Test).',
      point_value: 15,
      is_missing: true,
      field_key: 'tests',
      suggested_value: ['5-Fold Stratified Cross Validation', 'Inference Latency SLA Benchmark'],
    });
  }

  if (!hasReproducibility) {
    gaps.push({
      id: 'gap_reproducibility',
      category: 'testing',
      label: 'Specific Reproducibility Audit Seed',
      description: 'Provide deterministic random seed and SHA-256 commit hash.',
      point_value: 10,
      is_missing: true,
      field_key: 'reproducibility',
      suggested_value: 'Deterministic seed 42. sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    });
  }

  return gaps;
}

/**
 * Calculates what the score would be if selected gap toggles are turned on.
 */
export function simulateScoreWithToggles(
  originalCard: ModelCardOutput,
  selectedGapIds: string[]
): {
  simulatedScore: number;
  scoreGain: number;
  simulatedCard: ModelCardOutput;
} {
  const gaps = identifyModelGaps(originalCard);
  const cloned: any = JSON.parse(JSON.stringify(originalCard));

  for (const gap of gaps) {
    if (selectedGapIds.includes(gap.id)) {
      if (gap.field_key === 'metrics' && gap.suggested_value) {
        cloned.metrics = { ...(cloned.metrics || {}), ...gap.suggested_value };
      } else if (Array.isArray(gap.suggested_value)) {
        cloned[gap.field_key] = gap.suggested_value;
      } else {
        cloned[gap.field_key] = gap.suggested_value;
      }
    }
  }

  const simulatedScore = readiness_score(cloned);
  const scoreGain = Math.max(0, simulatedScore - (originalCard.readiness_score || 0));

  return {
    simulatedScore,
    scoreGain,
    simulatedCard: cloned,
  };
}
