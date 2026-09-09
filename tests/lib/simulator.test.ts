import { describe, it, expect } from 'vitest';
import { identifyModelGaps, simulateScoreWithToggles } from '../../src/lib/modelops/simulator';
import { ModelCardOutput } from '../../src/types/modelops';

describe('What Would It Take Simulator', () => {
  const incompleteCard: ModelCardOutput = {
    model_name: 'Incomplete-Classifier',
    version: '1.0.0',
    dataset: 'CustomerData.csv',
    intended_use: 'Classify tickets',
    metrics: { accuracy: 0.85 },
    readiness_score: 52,
    decision: 'pending_human_review',
  };

  it('should identify missing gaps with exact category point values', () => {
    const gaps = identifyModelGaps(incompleteCard);
    expect(gaps.length).toBeGreaterThanOrEqual(3);

    const testGap = gaps.find((g) => g.field_key === 'tests');
    expect(testGap).toBeDefined();
    expect(testGap?.point_value).toBe(15);

    const repGap = gaps.find((g) => g.field_key === 'reproducibility');
    expect(repGap).toBeDefined();
    expect(repGap?.point_value).toBe(10);
  });

  it('does not manufacture evidence or a score gain when toggles are turned on', () => {
    const gaps = identifyModelGaps(incompleteCard);
    const gapIds = gaps.map((g) => g.id);

    const { simulatedScore, scoreGain, simulatedCard } = simulateScoreWithToggles(
      incompleteCard,
      gapIds
    );

    expect(simulatedScore).toBe(incompleteCard.readiness_score);
    expect(scoreGain).toBe(0);
    expect(simulatedCard).toBe(incompleteCard);
  });
});
