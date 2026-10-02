import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeEvaluationCursor } from '../../src/lib/modelops/pagination';

const mocks = vi.hoisted(() => ({ actor: vi.fn(), rpc: vi.fn() }));
vi.mock('../../src/lib/auth/actor', () => ({ requireDefaultActor: mocks.actor }));
vi.mock('../../src/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ rpc: mocks.rpc }) }));

import { GET } from '../../src/app/api/reviews/route';

const actor = { userId: '1133a8ae-6426-40f0-b09e-3da587b66e16', organizationId: '18caec45-8054-4fdf-bd91-25fb38d3fd61', role: 'reviewer' };
const rows = [
  { id: '00000000-0000-4000-8000-000000000003', model_name: 'Newest', version: '3', readiness_score: 80, workflow_state: 'submitted', author_email: 'author@example.test', created_at: '2026-09-21T12:00:02.000+00:00', last_review_at: '2026-09-21T12:01:00.000+00:00' },
  { id: '00000000-0000-4000-8000-000000000002', model_name: 'Middle', version: '2', readiness_score: 60, workflow_state: 'under_review', author_email: 'author@example.test', created_at: '2026-09-21T12:00:01.000+00:00', last_review_at: null },
  { id: '00000000-0000-4000-8000-000000000001', model_name: 'Oldest', version: '1', readiness_score: 40, workflow_state: 'submitted', author_email: 'author@example.test', created_at: '2026-09-21T12:00:00.000+00:00', last_review_at: null },
];

describe('GET /api/reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.mockResolvedValue(actor);
    mocks.rpc.mockResolvedValue({ data: rows, error: null });
  });

  it('requires review permission and returns a bounded look-ahead page', async () => {
    const response = await GET(new Request('https://modelops.test/api/reviews?state=all&limit=2'));
    expect(response.status).toBe(200);
    expect(mocks.actor).toHaveBeenCalledWith('review');
    expect(mocks.rpc).toHaveBeenCalledWith('list_review_queue_as', {
      requesting_actor: actor.userId,
      target_organization: actor.organizationId,
      requested_state: null,
      requested_limit: 3,
      cursor_created_at: null,
      cursor_id: null,
    });
    await expect(response.json()).resolves.toMatchObject({ success: true, page_size: 2, has_more: true, reviews: rows.slice(0, 2), next_cursor: expect.any(String) });
  });

  it('passes only validated state and cursor fields to the trusted function', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [rows[2]], error: null });
    const timestamp = '2026-09-21T12:00:01.510661+00:00';
    const cursor = encodeEvaluationCursor({ createdAt: timestamp, id: rows[1].id, sort: 'newest' });
    const response = await GET(new Request(`https://modelops.test/api/reviews?state=submitted&cursor=${cursor}`));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('list_review_queue_as', expect.objectContaining({
      requested_state: 'submitted',
      cursor_created_at: timestamp,
      cursor_id: rows[1].id,
    }));
  });

  it('rejects unauthorized, unknown, repeated, and malformed query input before storage', async () => {
    mocks.actor.mockRejectedValueOnce(new Error('FORBIDDEN'));
    expect((await GET(new Request('https://modelops.test/api/reviews'))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();

    mocks.actor.mockResolvedValue(actor);
    for (const query of ['?organization_id=18caec45-8054-4fdf-bd91-25fb38d3fd61', '?state=draft', '?state=submitted&state=under_review', '?cursor=invalid%2Bcursor']) {
      expect((await GET(new Request(`https://modelops.test/api/reviews${query}`))).status).toBe(400);
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('fails closed when the function returns payload-shaped or invalid queue data', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{ ...rows[0], payload: { evidence: 'private' } }], error: null });
    expect((await GET(new Request('https://modelops.test/api/reviews'))).status).toBe(500);
  });
});
