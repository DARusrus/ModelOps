import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createAdminClient: vi.fn(), from: vi.fn(), select: vi.fn(), limit: vi.fn() }));

vi.mock('../../src/lib/supabase/admin', () => ({ createSupabaseAdminClient: mocks.createAdminClient }));
import { GET } from '../../src/app/api/health/route';

describe('GET /api/health', () => {
  let clock = Date.now();

  beforeEach(() => {
    vi.clearAllMocks();
    clock += 6_000;
    vi.spyOn(Date, 'now').mockReturnValue(clock);
    mocks.createAdminClient.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ limit: mocks.limit });
  });

  it('returns readiness only after a server-side database probe', async () => {
    mocks.limit.mockResolvedValue({ error: null });
    const response = await GET(new Request('https://example.test/api/health', { headers: { 'x-request-id': 'a8f0c345-8b9e-45f0-a3bc-cc565fb6094c' } }));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Request-Id')).toBe('a8f0c345-8b9e-45f0-a3bc-cc565fb6094c');
    expect(mocks.from).toHaveBeenCalledWith('organizations');
    expect(await response.json()).toEqual({ status: 'ok', checks: { database: 'ok' } });
  });

  it('does not expose a database failure reason', async () => {
    mocks.limit.mockResolvedValue({ error: { message: 'private connection failure' } });
    const response = await GET(new Request('https://example.test/api/health'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unavailable', checks: { database: 'unavailable' } });
  });
});
