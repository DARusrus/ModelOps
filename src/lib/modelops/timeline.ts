import { VersionHistoryPoint, ModelCardOutput } from '@/types/modelops';

export const DOMAIN_VERSION_HISTORIES: Record<string, VersionHistoryPoint[]> = {
  'llm-finetuning': [
    {
      version: 'v0.8.0',
      release_date: '2025-11-10',
      readiness_score: 64,
      metrics: { accuracy: 0.812, f1_score: 0.795, latency_ms: 145.0 },
      primary_change: 'Initial fine-tuning checkpoint without safety guardrails.',
      status: 'stable',
    },
    {
      version: 'v0.9.0',
      release_date: '2026-01-15',
      readiness_score: 72,
      metrics: { accuracy: 0.845, f1_score: 0.831, latency_ms: 132.0 },
      primary_change: 'Added LoRA adapter layers and token length filtering.',
      status: 'improved',
    },
    {
      version: 'v1.0.0',
      release_date: '2026-03-20',
      readiness_score: 78,
      metrics: { accuracy: 0.864, f1_score: 0.852, latency_ms: 125.0 },
      primary_change: 'Integrated 5-fold cross validation and reproducibility hash.',
      status: 'improved',
    },
    {
      version: 'v1.1.0',
      release_date: '2026-06-05',
      readiness_score: 88,
      metrics: { accuracy: 0.902, f1_score: 0.891, latency_ms: 118.0 },
      primary_change: 'Added RLHF alignment and sensitive data filtering.',
      status: 'improved',
    },
  ],
  'computer-vision': [
    {
      version: 'v0.6.0',
      release_date: '2025-10-12',
      readiness_score: 55,
      metrics: { accuracy: 0.832, f1_score: 0.814, latency_ms: 24.5 },
      primary_change: 'Initial ResNet50 baseline with standard ImageNet weights.',
      status: 'stable',
    },
    {
      version: 'v0.7.5',
      release_date: '2025-12-20',
      readiness_score: 64,
      metrics: { accuracy: 0.871, f1_score: 0.858, latency_ms: 21.0 },
      primary_change: 'Applied AutoAugment pipeline and lighting normalization.',
      status: 'improved',
    },
    {
      version: 'v0.9.0',
      release_date: '2026-03-10',
      readiness_score: 72,
      metrics: { accuracy: 0.912, f1_score: 0.905, latency_ms: 18.5 },
      primary_change: 'Added TensorRT FP16 quantization and edge SLA validation.',
      status: 'improved',
    },
  ],
  'nlp-classification': [
    {
      version: 'v0.8.0',
      release_date: '2025-11-25',
      readiness_score: 60,
      metrics: { accuracy: 0.825, f1_score: 0.801, latency_ms: 36.0 },
      primary_change: 'Vanilla BERT base model trained on clinical text sample.',
      status: 'stable',
    },
    {
      version: 'v0.9.0',
      release_date: '2026-02-14',
      readiness_score: 71,
      metrics: { accuracy: 0.862, f1_score: 0.849, latency_ms: 30.0 },
      primary_change: 'Domain-specific vocabulary masking and subgroup testing.',
      status: 'improved',
    },
    {
      version: 'v1.0.0',
      release_date: '2026-04-18',
      readiness_score: 75,
      metrics: { accuracy: 0.885, f1_score: 0.871, latency_ms: 28.0 },
      primary_change: 'MIMIC-IV deidentified notes training and fairness audit.',
      status: 'improved',
    },
  ],
  'tabular-classification': [
    {
      version: 'v0.8.0',
      release_date: '2025-12-01',
      readiness_score: 58,
      metrics: { accuracy: 0.910, f1_score: 0.885, latency_ms: 8.5 },
      primary_change: 'Initial Random Forest baseline on raw transaction features.',
      status: 'stable',
    },
    {
      version: 'v0.9.0',
      release_date: '2026-02-28',
      readiness_score: 74,
      metrics: { accuracy: 0.942, f1_score: 0.926, latency_ms: 5.2 },
      primary_change: 'Migrated to XGBoost with SMOTE balancing and latency SLAs.',
      status: 'improved',
    },
  ],
  'recommender-system': [
    {
      version: 'v0.8.0',
      release_date: '2025-12-15',
      readiness_score: 56,
      metrics: { ndcg: 0.74, map: 0.68, latency_ms: 45.0 },
      primary_change: 'Collaborative filtering baseline with matrix factorization.',
      status: 'stable',
    },
    {
      version: 'v0.9.0',
      release_date: '2026-03-05',
      readiness_score: 68,
      metrics: { ndcg: 0.81, map: 0.75, latency_ms: 38.0 },
      primary_change: 'Two-tower neural recommender with cold-start embeddings.',
      status: 'improved',
    },
  ],
};

export interface TimelineTrendSummary {
  points: VersionHistoryPoint[];
  trajectory: 'upward' | 'downward' | 'stable';
  scoreDelta: number;
  driftWarning: boolean;
  totalReleases: number;
  highestScore: number;
  lowestScore: number;
}

/**
 * Builds a continuous version timeline by combining domain history with current candidate output.
 */
export function buildVersionTimeline(
  currentCard: ModelCardOutput,
  templateId?: string | null
): TimelineTrendSummary {
  const key = templateId || 'llm-finetuning';
  const baselinePoints = DOMAIN_VERSION_HISTORIES[key] || DOMAIN_VERSION_HISTORIES['llm-finetuning'];

  const candidatePoint: VersionHistoryPoint = {
    version: `v${currentCard.version || '1.0.0'} (Current)`,
    release_date: new Date().toISOString().split('T')[0],
    readiness_score: currentCard.readiness_score || 0,
    metrics: currentCard.metrics || {},
    primary_change: currentCard.intended_use || 'Current evaluated release candidate.',
    status:
      baselinePoints.length > 0
        ? currentCard.readiness_score >= baselinePoints[baselinePoints.length - 1].readiness_score
          ? 'improved'
          : 'regressed'
        : 'stable',
  };

  const points = [...baselinePoints, candidatePoint];

  const firstScore = points[0].readiness_score;
  const lastScore = candidatePoint.readiness_score;
  const scoreDelta = lastScore - firstScore;

  let trajectory: 'upward' | 'downward' | 'stable' = 'stable';
  if (scoreDelta > 3) trajectory = 'upward';
  else if (scoreDelta < -3) trajectory = 'downward';

  // Check for consecutive drops
  let consecutiveDrops = 0;
  let maxConsecutiveDrops = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].readiness_score < points[i - 1].readiness_score) {
      consecutiveDrops++;
      maxConsecutiveDrops = Math.max(maxConsecutiveDrops, consecutiveDrops);
    } else {
      consecutiveDrops = 0;
    }
  }

  const scores = points.map((p) => p.readiness_score);

  return {
    points,
    trajectory,
    scoreDelta,
    driftWarning: maxConsecutiveDrops >= 2 || lastScore < (points[points.length - 2]?.readiness_score ?? 0),
    totalReleases: points.length,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
  };
}
