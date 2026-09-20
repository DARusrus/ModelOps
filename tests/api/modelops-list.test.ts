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
  { id: '00000000-0000-4000-8000-000000000003', model_name: 'Newest', model_version: '3', readiness_score: 80, workflow_state: 'submitted', created_by: '00000000-0000-4000-8000-000000000011', created_at: '2026-09-04T12:30:02.000+00:00', expires_at: '2027-09-04T12:30:02.000+00:00' },
  { id: '00000000-0000-4000-8000-000000000002', model_name: 'Middle', model_version: '2', readiness_score: 60, workflow_state: 'draft', created_by: '00000000-0000-4000-8000-000000000011', created_at: '2026-09-04T12:30:01.000+00:00', expires_at: '2027-09-04T12:30:01.000+00:00' },
  { id: '00000000-0000-4000-8000-000000000001', model_name: 'Oldest', model_version: '1', readiness_score: 40, workflow_state: 'draft', created_by: '00000000-0000-4000-8000-000000000011', created_at: '2026-09-04T12:30:00.000+00:00', expires_at: '2027-09-04T12:30:00.000+00:00' },
];

function queryReturning(data: unknown[]) {
  const query = {
    select: vi.fn(), eq: vi.fn(), gt: vi.fn(), gte: vi.fn(), lt: vi.fn(), lte: vi.fn(), order: vi.fn(), or: vi.fn(), limit: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gt.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.lt.mockReturnValue(query);
  query.lte.mockReturnValue(query);
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
    expect(query.select).toHaveBeenCalledWith('id, model_name, model_version, readiness_score, workflow_state, created_by, created_at, expires_at');
    expect(query.limit).toHaveBeenCalledWith(3);
    const body = await response.json();
    expect(body).toMatchObject({ success: true, page_size: 2, has_more: true, evaluations: [{ model_name: 'Newest', version: '3', workflow_state: 'submitted' }, { model_name: 'Middle', version: '2' }] });
    expect(typeof body.next_cursor).toBe('string');
  });

  it('applies the validated cursor as a descending seek filter', async () => {
    const query = queryReturning([rows[2]]);
    mocks.from.mockReturnValue(query);
    mocks.serverClient.mockResolvedValue({ from: mocks.from });
    const cursor = encodeEvaluationCursor({ createdAt: '2026-09-04T12:30:01.000Z', id: rows[1].id, sort: 'newest' });

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

  it('combines search and keyset continuation in one PostgREST boolean expression', async () => {
    const query = queryReturning([rows[2]]);
    mocks.from.mockReturnValue(query);
    mocks.serverClient.mockResolvedValue({ from: mocks.from });
    const cursor = encodeEvaluationCursor({ createdAt: '2026-09-04T12:30:01.000Z', id: rows[1].id, sort: 'newest' });
    const response = await GET(new Request(`https://example.test/api/modelops?q=Model&cursor=${cursor}`));
    expect(response.status).toBe(200);
    expect(query.or).toHaveBeenCalledTimes(1);
    expect(query.or).toHaveBeenCalledWith(`and(or(model_name.ilike.*Model*,model_version.ilike.*Model*),or(created_at.lt.2026-09-04T12:30:01.000Z,and(created_at.eq.2026-09-04T12:30:01.000Z,id.lt.${rows[1].id})))`);
  });

  it('rejects a cursor issued for a different sort direction', async () => {
    const cursor = encodeEvaluationCursor({ createdAt: '2026-09-04T12:30:01.000Z', id: rows[1].id, sort: 'newest' });
    const response = await GET(new Request(`https://example.test/api/modelops?sort=oldest&cursor=${cursor}`));
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ success: false, code: 'INVALID_CURSOR' });
  });

  it('applies typed tenant-safe catalog filters and oldest-first ordering', async () => {
    const query = queryReturning([rows[2]]);
    mocks.from.mockReturnValue(query);
    mocks.serverClient.mockResolvedValue({ from: mocks.from });
    const response = await GET(new Request('https://example.test/api/modelops?q=Oldest&state=draft&creator=me&created_from=2026-09-01&created_to=2026-09-04&readiness_min=25&readiness_max=70&sort=oldest&limit=10'));
    expect(response.status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith('organization_id', '00000000-0000-4000-8000-000000000010');
    expect(query.eq).toHaveBeenCalledWith('workflow_state', 'draft');
    expect(query.eq).toHaveBeenCalledWith('created_by', 'user-1');
    expect(query.or).toHaveBeenCalledWith('model_name.ilike.*Oldest*,model_version.ilike.*Oldest*');
    expect(query.gte).toHaveBeenCalledWith('created_at', '2026-09-01T00:00:00.000Z');
    expect(query.lt).toHaveBeenCalledWith('created_at', '2026-09-05T00:00:00.000Z');
    expect(query.gte).toHaveBeenCalledWith('readiness_score', 25);
    expect(query.lte).toHaveBeenCalledWith('readiness_score', 70);
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('rejects malformed or contradictory filters before querying storage', async () => {
    const response = await GET(new Request('https://example.test/api/modelops?readiness_min=90&readiness_max=20&unexpected=value'));
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ success: false, code: 'VALIDATION_FAILED' });
  });
});
