import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  serverClient: vi.fn(),
  requireActor: vi.fn(),
}));

vi.mock('../../src/lib/auth/actor', () => ({ requireDefaultActor: mocks.requireActor }));
vi.mock('../../src/lib/supabase/server', () => ({ createSupabaseServerClient: mocks.serverClient }));

import { GET } from '../../src/app/api/modelops/[id]/route';

const evaluationId = '00000000-0000-4000-8000-000000000001';
const organizationId = '00000000-0000-4000-8000-000000000010';
const timestamp = '2026-09-11T00:00:00.000+00:00';
const payload = {
  model_name: 'Persisted model',
  version: '1.0.0',
  dataset: 'authorized-benchmark',
  intended_use: 'Verify persisted record retrieval.',
  metrics: { accuracy: 0.9 },
  readiness_score: 75,
  decision: 'pending_human_review',
};

function queryReturning(data: unknown[]) {
  const query = { select: vi.fn(), eq: vi.fn(), gt: vi.fn(), limit: vi.fn() };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gt.mockReturnValue(query);
  query.limit.mockResolvedValue({ data, error: null });
  return query;
}

describe('GET /api/modelops/[id] saved evaluation detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireActor.mockResolvedValue({ userId: 'user-1', organizationId, role: 'admin' });
  });

  it('loads the full unexpired evaluation through the active organization boundary', async () => {
    const query = queryReturning([{ id: evaluationId, payload, workflow_state: 'rejected', created_at: timestamp, expires_at: '2027-09-11T00:00:00.000+00:00' }]);
    mocks.from.mockReturnValue(query);
    mocks.serverClient.mockResolvedValue({ from: mocks.from });

    const response = await GET(
      new Request(`https://example.test/api/modelops/${evaluationId}`),
      { params: Promise.resolve({ id: evaluationId }) },
    );

    expect(response.status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith('id', evaluationId);
    expect(query.eq).toHaveBeenCalledWith('organization_id', organizationId);
    expect(query.gt).toHaveBeenCalledWith('expires_at', expect.any(String));
    expect(await response.json()).toMatchObject({
      success: true,
      evaluation: { id: evaluationId, model_name: 'Persisted model', workflow_state: 'rejected' },
    });
  });

  it('returns not found without revealing an absent, expired, or cross-organization record', async () => {
    const query = queryReturning([]);
    mocks.from.mockReturnValue(query);
    mocks.serverClient.mockResolvedValue({ from: mocks.from });

    const response = await GET(
      new Request(`https://example.test/api/modelops/${evaluationId}`),
      { params: Promise.resolve({ id: evaluationId }) },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ success: false, error: 'Saved evaluation was not found' });
  });
});
