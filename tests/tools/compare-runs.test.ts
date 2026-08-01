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

  /**
   * ACCEPTED-DEFERRED — QC Finding #1
   *
   * compare_runs() defaults a missing metric to 0 (via `?? 0`).
   * Changing this to null or a sentinel string would be a breaking change
   * to the MetricDiff interface (run1_value/run2_value: number) and to the
   * /api/modelops/compare JSON response contract.
   *
   * Decision: preserve the 0-default for API backward compatibility.
   * These tests document and lock the intentional behavior.
   */
  it('[ACCEPTED-DEFERRED] metric present in run1 but absent in run2 defaults run2_value to 0', () => {
    const run1 = {
      model_name: 'ModelA',
      version: '1.0.0',
      dataset: 'DatasetA',
      metrics: { precision: 0.88 },
    };
    // run2 has no metrics at all
    const run2 = {
      model_name: 'ModelA',
      version: '2.0.0',
      dataset: 'DatasetA',
      metrics: {},
    };

    const comparison = compare_runs(run1, run2);

    const precisionDiff = comparison.metrics_diff.find((m) => m.metric_name === 'precision');
    expect(precisionDiff).toBeDefined();
    // API contract: missing metric defaults to 0, NOT null/undefined/'not measured'
    expect(precisionDiff?.run1_value).toBe(0.88);
    expect(precisionDiff?.run2_value).toBe(0);
    expect(precisionDiff?.delta).toBe(-0.88);
    expect(precisionDiff?.direction).toBe('degraded');
  });

  it('[ACCEPTED-DEFERRED] metric present in run2 but absent in run1 defaults run1_value to 0', () => {
    const run1 = {
      model_name: 'ModelB',
      version: '1.0.0',
      dataset: 'DatasetB',
      metrics: {},
    };
    const run2 = {
      model_name: 'ModelB',
      version: '2.0.0',
      dataset: 'DatasetB',
      metrics: { recall: 0.76 },
    };

    const comparison = compare_runs(run1, run2);

    const recallDiff = comparison.metrics_diff.find((m) => m.metric_name === 'recall');
    expect(recallDiff).toBeDefined();
    // API contract: missing metric defaults to 0, NOT null/undefined/'not measured'
    expect(recallDiff?.run1_value).toBe(0);
    expect(recallDiff?.run2_value).toBe(0.76);
    expect(recallDiff?.delta).toBe(0.76);
    expect(recallDiff?.direction).toBe('improved');
  });
});
