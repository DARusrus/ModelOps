import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ actor: vi.fn(), rpc: vi.fn() }));
vi.mock('../../src/lib/auth/actor', () => ({ requireDefaultActor: mocks.actor }));
vi.mock('../../src/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ rpc: mocks.rpc }) }));

import { GET } from '../../src/app/api/organization/members/route';
import { DELETE, PATCH } from '../../src/app/api/organization/members/[userId]/route';

const organizationId = '18caec45-8054-4fdf-bd91-25fb38d3fd61';
const actorId = '1133a8ae-6426-40f0-b09e-3da587b66e16';
const memberId = '833c602c-b015-4443-9502-079ef9476a3c';

describe('organization member APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.mockResolvedValue({ userId: actorId, organizationId, role: 'admin' });
    mocks.rpc.mockResolvedValue({ data: [{ user_id: actorId, email: 'admin@example.test', role: 'admin', created_at: new Date().toISOString() }], error: null });
  });

  it('lists member identity through the bounded trusted function', async () => {
    const response = await GET(new NextRequest('https://modelops.test/api/organization/members'));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('list_organization_members_as', { requesting_actor: actorId, target_organization: organizationId });
    await expect(response.json()).resolves.toMatchObject({ members: [{ is_current_user: true }] });
  });

  it('changes a role without accepting actor or organization identity from the body', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { user_id: memberId }, error: null });
    const response = await PATCH(new NextRequest(`https://modelops.test/api/organization/members/${memberId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'reviewer' }) }), { params: Promise.resolve({ userId: memberId }) });
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('change_organization_member_role_as', { requesting_actor: actorId, target_organization: organizationId, target_user: memberId, requested_role: 'reviewer' });
  });

  it('maps final-administrator protection to a conflict', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'FINAL_ADMIN_REQUIRED' } });
    const response = await DELETE(new NextRequest(`https://modelops.test/api/organization/members/${actorId}`, { method: 'DELETE' }), { params: Promise.resolve({ userId: actorId }) });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('final organization administrator') });
  });

  it('removes a validated member through the active organization boundary', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: memberId, error: null });
    const response = await DELETE(
      new NextRequest(`https://modelops.test/api/organization/members/${memberId}`, { method: 'DELETE' }),
      { params: Promise.resolve({ userId: memberId }) },
    );
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('remove_organization_member_as', {
      requesting_actor: actorId,
      target_organization: organizationId,
      target_user: memberId,
    });
  });

  it('rejects malformed member identifiers and role payloads before mutation', async () => {
    const malformedId = await DELETE(
      new NextRequest('https://modelops.test/api/organization/members/not-a-uuid', { method: 'DELETE' }),
      { params: Promise.resolve({ userId: 'not-a-uuid' }) },
    );
    expect(malformedId.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();

    const malformedRole = await PATCH(
      new NextRequest(`https://modelops.test/api/organization/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'owner' }),
      }),
      { params: Promise.resolve({ userId: memberId }) },
    );
    expect(malformedRole.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('rejects non-admin actors before using the service client', async () => {
    mocks.actor.mockRejectedValueOnce(new Error('FORBIDDEN'));
    const response = await PATCH(new NextRequest(`https://modelops.test/api/organization/members/${memberId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'admin' }) }), { params: Promise.resolve({ userId: memberId }) });
    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
