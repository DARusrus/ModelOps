import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ actor: vi.fn(), rpc: vi.fn() }));
vi.mock('../../src/lib/auth/actor', () => ({ requireDefaultActor: mocks.actor }));
vi.mock('../../src/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ rpc: mocks.rpc }) }));

import { GET } from '../../src/app/api/dashboard/route';

const actor = { userId: '1133a8ae-6426-40f0-b09e-3da587b66e16', organizationId: '18caec45-8054-4fdf-bd91-25fb38d3fd61', role: 'viewer' };
const emptyDashboard = {
  active_evaluations: 0,
  review_required: 0,
  workflow_counts: { draft: 0, submitted: 0, under_review: 0, approved: 0, rejected: 0, changes_requested: 0 },
  recent_evaluations: [],
  recent_activity: [],
};

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.mockResolvedValue(actor);
    mocks.rpc.mockResolvedValue({ data: emptyDashboard, error: null });
  });

  it('loads one bounded trusted snapshot and preserves an empty organization as zero state', async () => {
    const response = await GET(new Request('https://modelops.test/api/dashboard'));
    expect(response.status).toBe(200);
    expect(mocks.actor).toHaveBeenCalledWith('read');
    expect(mocks.rpc).toHaveBeenCalledWith('get_dashboard_snapshot_as', {
      requesting_actor: actor.userId,
      target_organization: actor.organizationId,
      recent_limit: 5,
    });
    await expect(response.json()).resolves.toEqual({ success: true, dashboard: emptyDashboard });
  });

  it('rejects unauthenticated access before creating a privileged query', async () => {
    mocks.actor.mockRejectedValueOnce(new Error('UNAUTHENTICATED'));
    const response = await GET(new Request('https://modelops.test/api/dashboard'));
    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('fails closed when storage or the strict response contract is invalid', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: '08006' } });
    expect((await GET(new Request('https://modelops.test/api/dashboard'))).status).toBe(503);

    mocks.rpc.mockResolvedValueOnce({ data: { ...emptyDashboard, raw_payload: { reason: 'must not escape' } }, error: null });
    expect((await GET(new Request('https://modelops.test/api/dashboard'))).status).toBe(500);
  });
});
