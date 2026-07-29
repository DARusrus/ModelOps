import { ExperimentMetadataInput } from './validators';
import { ReadinessScoreResult } from '@/types';

export function calculateReadinessScore(data: ExperimentMetadataInput): ReadinessScoreResult {
  const justifications: ReadinessScoreResult['justification'] = [];
  let totalScore = 0;

  const addScore = (criteria: string, points: number, maxPoints: number, passed: boolean, reason: string) => {
    totalScore += points;
    justifications.push({ criteria, points, max_points: maxPoints, passed, reason });
  };

  // 1. Dataset Quality (15%)
  if (data.dataset && data.dataset.length > 3) {
    addScore('Dataset Quality', 15, 15, true, 'Dataset name provided.');
  } else {
    addScore('Dataset Quality', 0, 15, false, 'Missing dataset information.');
  }

  // 2. Metrics (25%)
  const metricsCount = Object.keys(data.metrics || {}).length;
  if (metricsCount >= 3) {
    addScore('Metrics', 25, 25, true, 'Comprehensive metrics provided.');
  } else if (metricsCount > 0) {
    addScore('Metrics', 15, 25, true, 'Some metrics provided, but could be more comprehensive.');
  } else {
    addScore('Metrics', 0, 25, false, 'No metrics provided.');
  }

  // 3. Validation & Testing (15%)
  const testsCount = data.tests?.length || 0;
  if (testsCount >= 2 && data.reproducibility) {
    addScore('Validation', 15, 15, true, 'Testing and reproducibility details provided.');
  } else if (testsCount > 0) {
    addScore('Validation', 8, 15, true, 'Some testing details provided.');
  } else {
    addScore('Validation', 0, 15, false, 'Missing testing and reproducibility information.');
  }

  // 4. Deployment (15%)
  const hasDeployment = data.deployment?.platform || data.deployment?.latency || data.deployment?.environment;
  if (hasDeployment) {
    addScore('Deployment', 15, 15, true, 'Deployment configuration details provided.');
  } else {
    addScore('Deployment', 0, 15, false, 'Missing deployment details.');
  }

  // 5. Training & Hardware (15%)
  const hasTraining = data.training?.epochs || data.training?.optimizer || data.hardware?.gpu;
  if (hasTraining) {
    addScore('Training & Hardware', 15, 15, true, 'Training and hardware context provided.');
  } else {
    addScore('Training & Hardware', 0, 15, false, 'Missing training or hardware context.');
  }

  // 6. Security, Ethics, Bias (10%)
  const hasRisk = data.risk_assessment?.ethics || data.risk_assessment?.bias;
  if (hasRisk) {
    addScore('Security & Ethics', 10, 10, true, 'Ethical and bias considerations documented.');
  } else {
    addScore('Security & Ethics', 0, 10, false, 'Missing ethical and bias considerations.');
  }

  // 7. Documentation (5%)
  if (data.intended_use && data.limitations && data.limitations.length > 0) {
    addScore('Documentation', 5, 5, true, 'Intended use and limitations clearly documented.');
  } else {
    addScore('Documentation', 2, 5, false, 'Partial documentation provided.');
  }
  
  // Normalize score in case of rounding errors (though it adds up to 100)
  totalScore = Math.min(Math.max(Math.round(totalScore), 0), 100);
  
  let decision: 'APPROVED' | 'REVIEW' | 'REJECTED' = 'REVIEW';
  if (totalScore >= 80) decision = 'APPROVED';
  else if (totalScore < 50) decision = 'REJECTED';
  
  const breakdown: Record<string, number> = {};
  justifications.forEach(j => {
    breakdown[j.criteria] = j.points;
  });

  return {
    score: totalScore,
    decision,
    justification: justifications,
    breakdown,
    reasons: justifications.map((item) => `${item.criteria}: ${item.reason}`),
  };
}
