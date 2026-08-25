import { describe, it, expect } from 'vitest';
import { buildVersionTimeline, DOMAIN_VERSION_HISTORIES } from '../../src/lib/modelops/timeline';
import { ModelCardOutput } from '../../src/types/modelops';

describe('Readiness Timeline Engine', () => {
  const sampleCard: ModelCardOutput = {
    model_name: 'Candidate-LLM',
    version: '1.2.0',
    dataset: 'TestDS',
    intended_use: 'Customer intent routing',
    metrics: { accuracy: 0.94, f1_score: 0.92 },
    readiness_score: 92,
    decision: 'pending_human_review',
  };

  it('should build timeline points with baseline history and candidate point', () => {
    const summary = buildVersionTimeline(sampleCard, 'llm-finetuning');
    expect(summary.points.length).toBeGreaterThanOrEqual(4);
    expect(summary.totalReleases).toBe(summary.points.length);
    expect(summary.points[summary.points.length - 1].readiness_score).toBe(92);
    expect(summary.points[summary.points.length - 1].version).toContain('1.2.0');
  });

  it('should identify upward trajectory when score improves over lifecycle', () => {
    const summary = buildVersionTimeline(sampleCard, 'llm-finetuning');
    expect(summary.trajectory).toBe('upward');
    expect(summary.scoreDelta).toBeGreaterThan(0);
  });

  it('should detect downward drift warning when score regresses severely', () => {
    const regressedCard: ModelCardOutput = {
      ...sampleCard,
      version: '1.2.0',
      readiness_score: 45,
    };
    const summary = buildVersionTimeline(regressedCard, 'llm-finetuning');
    expect(summary.driftWarning).toBe(true);
  });
});
