import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
  membershipResult: { data: [] as Array<{ organization_id: string; role: string; created_at: string }>, error: null as null | { message: string } },
  organizationResult: { data: [] as Array<{ id: string; name: string }>, error: null as null | { message: string } },
}));

vi.mock('next/headers', () => ({ cookies: mocks.cookies }));
vi.mock('../../src/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from })),
}));

import { requireWorkspaceContext } from '../../src/lib/auth/workspace-context';

const firstOrganization = '18caec45-8054-4fdf-bd91-25fb38d3fd61';
const secondOrganization = '2f7d34c1-e4dc-4c61-96d3-bf245ec992af';

describe('protected workspace context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'member@example.test' } }, error: null });
    mocks.cookies.mockResolvedValue({ get: vi.fn(() => ({ value: secondOrganization })) });
    mocks.membershipResult = {
      data: [
        { organization_id: firstOrganization, role: 'admin', created_at: '2026-01-01T00:00:00Z' },
        { organization_id: secondOrganization, role: 'viewer', created_at: '2026-01-02T00:00:00Z' },
      ],
      error: null,
    };
    mocks.organizationResult = {
      data: [
        { id: firstOrganization, name: 'Primary organization' },
        { id: secondOrganization, name: 'Review organization' },
      ],
      error: null,
    };
    mocks.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return { select: () => ({ eq: () => ({ order: async () => mocks.membershipResult }) }) };
      }
      if (table === 'organizations') {
        return { select: () => ({ in: async () => mocks.organizationResult }) };
      }
      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it('resolves the cookie-selected organization and every available membership', async () => {
    await expect(requireWorkspaceContext()).resolves.toEqual({
      accountEmail: 'member@example.test',
      activeOrganization: { id: secondOrganization, name: 'Review organization', role: 'viewer' },
      organizations: [
        { id: firstOrganization, name: 'Primary organization', role: 'admin' },
        { id: secondOrganization, name: 'Review organization', role: 'viewer' },
      ],
    });
  });

  it('requires an explicit selection when multiple memberships have no active cookie', async () => {
    mocks.cookies.mockResolvedValueOnce({ get: vi.fn(() => undefined) });
    await expect(requireWorkspaceContext()).rejects.toThrow('ORGANIZATION_SELECTION_REQUIRED');
  });

  it('falls back to the sole membership only when there is no active cookie', async () => {
    mocks.cookies.mockResolvedValueOnce({ get: vi.fn(() => undefined) });
    mocks.membershipResult.data = [mocks.membershipResult.data[0]];
    mocks.organizationResult.data = [mocks.organizationResult.data[0]];
    await expect(requireWorkspaceContext()).resolves.toMatchObject({
      activeOrganization: { id: firstOrganization, role: 'admin' },
    });
  });

  it('does not use a stale or unauthorized organization cookie', async () => {
    mocks.cookies.mockResolvedValueOnce({ get: vi.fn(() => ({ value: '833c602c-b015-4443-9502-079ef9476a3c' })) });
    await expect(requireWorkspaceContext()).rejects.toThrow('ORGANIZATION_SELECTION_REQUIRED');
  });

  it('enforces requested permissions at the server boundary', async () => {
    await expect(requireWorkspaceContext('admin')).rejects.toThrow('FORBIDDEN');
  });
});
