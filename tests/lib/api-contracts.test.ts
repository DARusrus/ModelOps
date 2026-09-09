import { describe, expect, it } from 'vitest';
import {
  CompareRequestSchema,
  ComparisonResponseSchema,
  EvaluationListResponseSchema,
  ExperimentMetadataSchema,
  HealthResponseSchema,
  ReviewRequestSchema,
} from '../../src/domain/modelops/api-contracts';
import { ModelCardOutputSchema as LegacyModelCardSchema } from '../../src/lib/modelops/schema';
import { ModelCardOutputSchema } from '../../src/domain/modelops/model-card';

const id = '00000000-0000-4000-8000-000000000001';
const timestamp = '2026-09-06T00:00:00.000+00:00';

describe('canonical ModelOps API contracts', () => {
  it('owns the model-card schema in the domain layer while preserving the compatibility export', () => {
    expect(LegacyModelCardSchema).toBe(ModelCardOutputSchema);
    expect(ModelCardOutputSchema.parse({
      model_name: 'Canonical card', version: '1.0.0', dataset: 'benchmark', intended_use: 'contract validation', readiness_score: 50,
    }).decision).toBe('pending_human_review');
  });

  it('applies creation defaults and rejects undeclared request fields', () => {
    expect(ExperimentMetadataSchema.parse({
      model_name: 'Canonical input', dataset: 'benchmark', intended_use: 'contract validation',
    })).toMatchObject({ version: '1.0.0', data_classification: 'unclassified', metrics: {}, evidence_items: [] });
    expect(() => ExperimentMetadataSchema.parse({
      model_name: 'Canonical input', dataset: 'benchmark', intended_use: 'contract validation', untrusted: true,
    })).toThrow();
  });

  it('rejects malformed route request DTOs before persistence or comparison', () => {
    expect(() => CompareRequestSchema.parse({ baseline_id: id, candidate_id: 'not-a-uuid' })).toThrow();
    expect(() => ReviewRequestSchema.parse({ action: 'draft', reason: 'not an attestation', policy_id: 'enterprise_general' })).toThrow();
  });

  it('validates list, comparison, and health success DTOs without allowing undeclared fields', () => {
    expect(EvaluationListResponseSchema.parse({
      success: true,
      evaluations: [{ id, model_name: 'Canonical card', version: '1.0.0', readiness_score: 50, created_at: timestamp, expires_at: '2027-09-06T00:00:00.000+00:00' }],
      page_size: 20, has_more: false, next_cursor: null,
    }).evaluations).toHaveLength(1);
    expect(() => HealthResponseSchema.parse({ status: 'ok', checks: { database: 'ok' }, debug: 'leak' })).toThrow();
    expect(ComparisonResponseSchema.parse({
      success: true,
      comparison: {
        model_name_1: 'A', version_1: '1.0.0', model_name_2: 'B', version_2: '1.0.1', metrics_diff: [],
        readiness_score_1: 50, readiness_score_2: 60, readiness_delta: 10, summary: ['Candidate readiness increased.'],
      },
    }).comparison.readiness_delta).toBe(10);
  });
});
