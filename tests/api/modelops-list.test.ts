import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeEvaluationCursor } from '../../src/lib/modelops/pagination';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  serverClient: vi.fn(),
  requireActor: vi.fn(),
}));

vi.mock('../../src/lib/auth/actor', () => ({ requireDefaultActor: mocks.requireActor }));
vi.mock('../../src/lib/supabase/server', () => ({ createSupabaseServerClient: mocks.serverClient }));
vi.mock('../../src/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }));

import { GET } from '../../src/app/api/modelops/route';

const requestId = 'a8f0c345-8b9e-45f0-a3bc-cc565fb6094c';
const rows = [
  { id: '00000000-0000-4000-8000-000000000003', model_name: 'Newest', model_version: '3', readiness_score: 80, created_at: '2026-09-04T12:30:02.000+00:00', expires_at: '2027-09-04T12:30:02.000+00:00' },
  { id: '00000000-0000-4000-8000-000000000002', model_name: 'Middle', model_version: '2', readiness_score: 60, created_at: '2026-09-04T12:30:01.000+00:00', expires_at: '2027-09-04T12:30:01.000+00:00' },
  { id: '00000000-0000-4000-8000-000000000001', model_name: 'Oldest', model_version: '1', readiness_score: 40, created_at: '2026-09-04T12:30:00.000+00:00', expires_at: '2027-09-04T12:30:00.000+00:00' },
];

function queryReturning(data: unknown[]) {
  const query = {
    select: vi.fn(), eq: vi.fn(), gt: vi.fn(), order: vi.fn(), or: vi.fn(), limit: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gt.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.or.mockReturnValue(query);
  query.limit.mockResolvedValue({ data, error: null });
  return query;
}

describe('GET /api/modelops saved evaluation list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireActor.mockResolvedValue({ userId: 'user-1', organizationId: '00000000-0000-4000-8000-000000000010', role: 'admin' });
  });

  it('reads a small projection, requests one look-ahead row, and returns a continuation cursor', async () => {
    const query = queryReturning(rows);
    mocks.from.mockReturnValue(query);
    mocks.serverClient.mockResolvedValue({ from: mocks.from });

    const response = await GET(new Request('https://example.test/api/modelops?limit=2', { headers: { 'x-request-id': requestId } }));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Request-Id')).toBe(requestId);
    expect(query.select).toHaveBeenCalledWith('id, model_name, model_version, readiness_score, created_at, expires_at');
    expect(query.limit).toHaveBeenCalledWith(3);
    const body = await response.json();
    expect(body).toMatchObject({ success: true, page_size: 2, has_more: true, evaluations: [{ model_name: 'Newest', version: '3' }, { model_name: 'Middle', version: '2' }] });
    expect(typeof body.next_cursor).toBe('string');
  });

  it('applies the validated cursor as a descending seek filter', async () => {
    const query = queryReturning([rows[2]]);
    mocks.from.mockReturnValue(query);
    mocks.serverClient.mockResolvedValue({ from: mocks.from });
    const cursor = encodeEvaluationCursor({ createdAt: '2026-09-04T12:30:01.000Z', id: rows[1].id });

    const response = await GET(new Request(`https://example.test/api/modelops?cursor=${cursor}`, { headers: { 'x-request-id': requestId } }));
    expect(response.status).toBe(200);
    expect(query.or).toHaveBeenCalledWith(`created_at.lt.2026-09-04T12:30:01.000Z,and(created_at.eq.2026-09-04T12:30:01.000Z,id.lt.${rows[1].id})`);
    expect((await response.json()).next_cursor).toBeNull();
  });

  it('rejects an invalid cursor before a database query is made', async () => {
    const response = await GET(new Request('https://example.test/api/modelops?cursor=untrusted%2Binput', { headers: { 'x-request-id': requestId } }));
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ success: false, code: 'INVALID_CURSOR' });
  });
});
