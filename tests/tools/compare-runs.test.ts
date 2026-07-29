import { describe, it, expect } from 'vitest';
import { compare_runs } from '../../src/lib/modelops/tools';

describe('compare_runs', () => {
  it('should correctly compare two experiment runs', () => {
    const run1 = {
      model_name: 'Classifier-A',
      version: '1.0.0',
      dataset: 'ImageNet-Mini',
      metrics: {
        accuracy: 0.85,
        loss: 0.35,
      },
    };

    const run2 = {
      model_name: 'Classifier-A',
      version: '2.0.0',
      dataset: 'ImageNet-Full',
      metrics: {
        accuracy: 0.92,
        loss: 0.18,
      },
      tests: ['Accuracy test', 'Robustness test'],
      limitations: ['GPU memory constraint'],
      risks: ['Domain shift risk'],
    };

    const comparison = compare_runs(run1, run2);

    expect(comparison.model_name_1).toBe('Classifier-A');
    expect(comparison.version_1).toBe('1.0.0');
    expect(comparison.version_2).toBe('2.0.0');

    // Accuracy increased (improved)
    const accDiff = comparison.metrics_diff.find((m) => m.metric_name === 'accuracy');
    expect(accDiff).toBeDefined();
    expect(accDiff?.direction).toBe('improved');
    expect(accDiff?.delta).toBe(0.07);

    // Loss decreased (improved, because lower loss is better)
    const lossDiff = comparison.metrics_diff.find((m) => m.metric_name === 'loss');
    expect(lossDiff).toBeDefined();
    expect(lossDiff?.direction).toBe('improved');

    // Run 2 has more fields so score 2 > score 1
    expect(comparison.readiness_score_2).toBeGreaterThan(comparison.readiness_score_1);
    expect(comparison.readiness_delta).toBeGreaterThan(0);
    expect(comparison.summary.length).toBeGreaterThan(0);
  });
});

