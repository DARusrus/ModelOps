import { describe, expect, it } from 'vitest';
import { evaluationSearchFilter, inclusiveEndDate, parseEvaluationCatalogQuery } from '../../src/lib/modelops/catalog-query';

describe('evaluation catalog query boundary', () => {
  it('applies bounded defaults and parses supported filters', () => {
    expect(parseEvaluationCatalogQuery(new URLSearchParams())).toMatchObject({ limit: 20, sort: 'newest' });
    expect(parseEvaluationCatalogQuery(new URLSearchParams('state=submitted&creator=me&readiness_min=10&readiness_max=90&sort=oldest'))).toMatchObject({
      state: 'submitted', creator: 'me', readiness_min: 10, readiness_max: 90, sort: 'oldest', limit: 20,
    });
  });

  it('rejects duplicate, unknown, reserved, and contradictory input', () => {
    expect(() => parseEvaluationCatalogQuery(new URLSearchParams('state=draft&state=approved'))).toThrow();
    expect(() => parseEvaluationCatalogQuery(new URLSearchParams('organization_id=00000000-0000-4000-8000-000000000001'))).toThrow('INVALID_CATALOG_QUERY');
    expect(() => parseEvaluationCatalogQuery(new URLSearchParams('q=model%2Corganization_id.eq.secret'))).toThrow();
    expect(() => parseEvaluationCatalogQuery(new URLSearchParams('created_from=2026-02-31'))).toThrow();
    expect(() => parseEvaluationCatalogQuery(new URLSearchParams('created_from=2026-09-10&created_to=2026-09-01'))).toThrow();
  });

  it('constructs only schema-safe search grammar and an inclusive end-date boundary', () => {
    expect(evaluationSearchFilter('  Model   1.0  ')).toBe('model_name.ilike.*Model 1.0*,model_version.ilike.*Model 1.0*');
    expect(inclusiveEndDate('2026-09-30')).toBe('2026-10-01T00:00:00.000Z');
  });
});
