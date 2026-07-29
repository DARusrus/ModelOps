import { describe, it, expect } from 'vitest';
import { readiness_score, readiness_score_detail } from '../../src/lib/modelops/tools';

describe('readiness_score', () => {
  it('should calculate 0 or minimal score for empty object', () => {
    const score = readiness_score({});
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(50);
  });

  it('should calculate high readiness score (>80) for fully documented model card', () => {
    const fullCard = {
      model_name: 'FraudDetector-X',
      version: '1.2.0',
      dataset: 'Transactions-2026',
      input_shape: '(batch, 64)',
      data_types: ['float32', 'int64'],
      metrics: {
        accuracy: 0.985,
        f1_score: 0.972,
        auc_roc: 0.991,
      },
      intended_use: 'Real-time financial fraud detection',
      limitations: ['Requires sub-50ms inference latency', 'Trained on USD transactions only'],
      risks: ['Potential false positives on unusual holiday shopping behavior'],
      warnings: ['Contains sensitive financial feature columns'],
      tests: ['Unit tests passed', 'Latency benchmark passed', 'Fairness audit passed'],
      reproducibility: 'MLflow run ID 849302',
    };

    const detail = readiness_score_detail(fullCard);
    expect(detail.score).toBeGreaterThanOrEqual(80);
    expect(detail.justification.length).toBe(5);
    expect(detail.breakdown.identification).toBe(10);
    expect(detail.breakdown.metrics).toBe(25);
  });
});

