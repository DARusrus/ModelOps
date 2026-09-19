import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  memberships: [
    { organization_id: '18caec45-8054-4fdf-bd91-25fb38d3fd61', role: 'admin' },
    { organization_id: '2f7d34c1-e4dc-4c61-96d3-bf245ec992af', role: 'viewer' },
  ],
  organizations: [
    { id: '18caec45-8054-4fdf-bd91-25fb38d3fd61', name: 'Primary organization' },
    { id: '2f7d34c1-e4dc-4c61-96d3-bf245ec992af', name: 'Review organization' },
  ],
}));

vi.mock('../../src/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from })),
}));

import { GET, POST } from '../../src/app/api/organization/active/route';

function selectionRequest(organizationId: string) {
  return new NextRequest('https://modelops.example.test/api/organization/active', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organization_id: organizationId }),
  });
}

describe('active organization API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mocks.from.mockImplementation((table: string) => {
      if (table === 'memberships') {
        return { select: () => ({ eq: () => ({ order: async () => ({ data: mocks.memberships, error: null }) }) }) };
      }
      if (table === 'organizations') {
        return { select: () => ({ in: async () => ({ data: mocks.organizations, error: null }) }) };
      }
      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it('lists only the authenticated user memberships with organization names', async () => {
    const response = await GET(new NextRequest('https://modelops.example.test/api/organization/active'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      organizations: [
        { organization_id: mocks.memberships[0].organization_id, name: 'Primary organization', role: 'admin' },
        { organization_id: mocks.memberships[1].organization_id, name: 'Review organization', role: 'viewer' },
      ],
    });
  });

  it('sets a secure server-owned selection cookie for a valid membership', async () => {
    const response = await POST(selectionRequest(mocks.memberships[1].organization_id));
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`modelops-active-organization=${mocks.memberships[1].organization_id}`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=lax');
  });

  it('rejects a valid UUID that is not one of the actor memberships', async () => {
    const response = await POST(selectionRequest('833c602c-b015-4443-9502-079ef9476a3c'));
    expect(response.status).toBe(403);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('rejects unauthenticated and malformed selection requests', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
    expect((await GET(new NextRequest('https://modelops.example.test/api/organization/active'))).status).toBe(401);

    const malformed = await POST(selectionRequest('not-a-uuid'));
    expect(malformed.status).toBe(400);
  });
});
