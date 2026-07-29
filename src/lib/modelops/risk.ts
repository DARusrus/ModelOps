import { ExperimentMetadataInput } from './validators';
import { RiskClassificationResult } from '@/types';

export function calculateRiskClassification(data: ExperimentMetadataInput): RiskClassificationResult {
  let riskScore = 0;
  const reasons: string[] = [];

  // Check Data & Security (High Impact)
  if (!data.risk_assessment?.ethics && !data.risk_assessment?.bias) {
    riskScore += 40;
    reasons.push('No ethics or bias assessment provided.');
  } else if (!data.risk_assessment?.bias) {
    riskScore += 20;
    reasons.push('Bias assessment is missing.');
  }

  // Check Deployment (Medium Impact)
  if (!data.deployment?.environment || data.deployment.environment.toLowerCase() !== 'production') {
    // If not production, risk is inherently lower, but let's check latency/memory
    if (data.deployment?.latency && parseInt(data.deployment.latency) > 1000) {
      riskScore += 15;
      reasons.push('High latency reported for deployment.');
    }
  } else {
    // Production deployment needs strict checks
    riskScore += 10;
    reasons.push('Targeting production environment (inherent risk).');
    if (!data.deployment?.latency) {
      riskScore += 25;
      reasons.push('Production deployment missing latency SLAs.');
    }
  }

  // Check Metrics (High Impact)
  const accuracy = data.metrics?.accuracy || data.metrics?.Accuracy || 0;
  const f1 = data.metrics?.f1 || data.metrics?.F1 || 0;
  
  if (Object.keys(data.metrics || {}).length === 0) {
    riskScore += 30;
    reasons.push('No performance metrics provided.');
  } else if (accuracy < 0.7 && f1 < 0.7) {
    riskScore += 25;
    reasons.push('Key performance metrics (Accuracy/F1) are below 0.7 threshold.');
  }

  // Check Testing & Limitations (Medium Impact)
  if (!data.tests || data.tests.length === 0) {
    riskScore += 20;
    reasons.push('No tests defined.');
  }
  
  if (!data.limitations || data.limitations.length === 0) {
    riskScore += 15;
    reasons.push('No limitations acknowledged, indicating potential blind spots.');
  }

  let level: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
  
  if (riskScore >= 70) {
    level = 'Critical';
  } else if (riskScore >= 40) {
    level = 'High';
  } else if (riskScore >= 20) {
    level = 'Medium';
  }

  if (reasons.length === 0) {
    reasons.push('All standard governance checks passed. Minimal risk identified.');
  }

  return {
    level,
    explanation: reasons.join(' '),
    reasons,
  };
}
