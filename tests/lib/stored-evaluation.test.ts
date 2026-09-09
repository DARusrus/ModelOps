import { describe, expect, it } from 'vitest';
import { parseStoredEvaluationSummaries, parseStoredEvaluations } from '../../src/lib/modelops/stored-evaluation';

const card = { model_name: 'A', version: '1', dataset: 'D', intended_use: 'Testing', readiness_score: 50, decision: 'pending_human_review' };

describe('stored evaluation boundary', () => {
  it('accepts a valid persisted evaluation', () => {
    expect(parseStoredEvaluations([{ id: '00000000-0000-4000-8000-000000000001', payload: card, created_at: '2026-09-03T00:00:00.000+00:00', expires_at: '2027-09-03T00:00:00.000+00:00' }])).toHaveLength(1);
  });
  it('rejects malformed persisted payloads instead of returning unchecked JSON', () => {
    expect(() => parseStoredEvaluations([{ id: 'bad', payload: {}, created_at: 'today', expires_at: 'never' }])).toThrow();
  });
  it('returns a list-safe summary without parsing a full card payload', () => {
    const summaries = parseStoredEvaluationSummaries([{ id: '00000000-0000-4000-8000-000000000001', model_name: 'A', model_version: '1', readiness_score: 50, created_at: '2026-09-03T00:00:00.000+00:00', expires_at: '2027-09-03T00:00:00.000+00:00' }]);
    expect(summaries[0].model_name).toBe('A');
  });
});
