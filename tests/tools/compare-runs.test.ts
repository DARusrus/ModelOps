import { describe, it, expect } from 'vitest';
import { compare_runs } from '../../src/lib/modelops/tools';
import sampleExperiments from '../fixtures/modelops/sample-experiments.json';

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
describe('compare_runs — fixture-based coverage (Zein)', () => {
  function findRecord(id: string) {
    const record = sampleExperiments.find((candidate) => candidate.id === id);
    if (!record) throw new Error(`Fixture ${id} not found`);
    return record;
  }

  it('reports equal readiness for two fully-documented runs (exp-001 vs exp-002)', () => {
    const result = compare_runs(findRecord('exp-001'), findRecord('exp-002'));
    expect(result.readiness_delta).toBe(0);
    expect(result.summary[0]).toContain('equal overall readiness scores');
  });

  it('marks accuracy and loss as improved from exp-001 to exp-002', () => {
    const result = compare_runs(findRecord('exp-001'), findRecord('exp-002'));
    const acc = result.metrics_diff.find((m) => m.metric_name === 'accuracy');
    const loss = result.metrics_diff.find((m) => m.metric_name === 'loss');
    expect(acc?.direction).toBe('improved');
    expect(loss?.direction).toBe('improved'); // lower loss is better
  });

  it('does not invent a zero value when a metric was not measured', () => {
    const exp3 = findRecord('exp-003'); // no metrics at all
    const exp4 = findRecord('exp-004'); // has accuracy, f1
    const result = compare_runs(exp3, exp4);
    const f1Diff = result.metrics_diff.find((m) => m.metric_name === 'f1');
    expect(f1Diff?.run1_value).toBeNull();
    expect(f1Diff?.run2_value).toBe(0.83);
    expect(f1Diff?.delta).toBeNull();
    expect(f1Diff?.direction).toBe('unchanged');
    expect(f1Diff?.comparison_status).toBe('not_measured');
  });

  it('refuses a structured comparison when the evidence units differ', () => {
    const run1 = { model_name: 'A', version: '1', dataset: 'Benchmark', metrics: { latency: 100 }, evidence_items: [{ kind: 'metric', label: 'latency', reference: 'run-a', attributes: { unit: 'ms', evaluation_reference: 'Benchmark' } }] };
    const run2 = { model_name: 'A', version: '2', dataset: 'Benchmark', metrics: { latency: 0.1 }, evidence_items: [{ kind: 'metric', label: 'latency', reference: 'run-b', attributes: { unit: 's', evaluation_reference: 'Benchmark' } }] };
    const latency = compare_runs(run1, run2).metrics_diff[0];
    expect(latency.comparison_status).toBe('incompatible_unit');
    expect(latency.delta).toBeNull();
  });

  it('compares structured metrics only when the evaluation dataset is the same', () => {
    const evidence = [{ kind: 'metric', label: 'accuracy', reference: 'evaluation-run', attributes: { unit: 'ratio', evaluation_reference: 'Benchmark' } }];
    const result = compare_runs({ model_name: 'A', version: '1', dataset: 'A', metrics: { accuracy: 0.8 }, evidence_items: evidence }, { model_name: 'A', version: '2', dataset: 'B', metrics: { accuracy: 0.9 }, evidence_items: evidence });
    expect(result.metrics_diff[0].comparison_status).toBe('different_dataset');
  });
});
