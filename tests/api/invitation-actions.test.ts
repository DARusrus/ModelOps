import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  rpc: vi.fn(),
  single: vi.fn(),
  deliver: vi.fn(),
  links: vi.fn(),
}));

vi.mock('../../src/lib/auth/actor', () => ({ requireDefaultActor: mocks.actor }));
vi.mock('../../src/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock('../../src/lib/auth/invitation-delivery', () => ({
  deliverOrganizationInvitation: mocks.deliver,
  invitationLinks: mocks.links,
}));

import { DELETE, PATCH } from '../../src/app/api/organization/invitations/[id]/route';

const invitationId = '63950e1e-3f72-4bf0-a5ac-fc06699ae500';
const organizationId = '18caec45-8054-4fdf-bd91-25fb38d3fd61';
const actorId = '1133a8ae-6426-40f0-b09e-3da587b66e16';
const now = new Date().toISOString();

function invitationRow() {
  return {
    invitation_id: invitationId,
    invitation_email: 'reviewer@example.test',
    invitation_role: 'reviewer',
    invitation_expires_at: now,
    invitation_created_at: now,
    recipient_exists: true,
  };
}

describe('organization invitation action APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.mockResolvedValue({ userId: actorId, organizationId, role: 'admin' });
    mocks.links.mockReturnValue({
      acceptanceUrl: `https://modelops.test/invite/accept?invitation=${invitationId}`,
      callbackUrl: 'https://modelops.test/auth/callback?next=invite',
    });
    mocks.deliver.mockResolvedValue('sent');
    mocks.single.mockResolvedValue({ data: invitationRow(), error: null });
    mocks.rpc.mockImplementation((functionName: string) => (
      functionName === 'renew_organization_invitation_as'
        ? { single: mocks.single }
        : Promise.resolve({ data: { id: invitationId }, error: null })
    ));
  });

  it('renews a validated pending invitation and reports delivery', async () => {
    const response = await PATCH(
      new NextRequest(`https://modelops.test/api/organization/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend' }),
      }),
      { params: Promise.resolve({ id: invitationId }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('renew_organization_invitation_as', {
      requesting_actor: actorId,
      target_invitation: invitationId,
    });
    expect(mocks.deliver).toHaveBeenCalledWith('reviewer@example.test', expect.any(String), true);
  });

  it('revokes a validated pending invitation', async () => {
    const response = await DELETE(
      new NextRequest(`https://modelops.test/api/organization/invitations/${invitationId}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: invitationId }) },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, invitation_id: invitationId });
  });

  it.each([
    ['PATCH', PATCH],
    ['DELETE', DELETE],
  ] as const)('rejects an invalid identifier before %s reaches the database', async (method, handler) => {
    const request = new NextRequest('https://modelops.test/api/organization/invitations/not-a-uuid', {
      method,
      headers: method === 'PATCH' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'PATCH' ? JSON.stringify({ action: 'resend' }) : undefined,
    });
    const response = await handler(request, { params: Promise.resolve({ id: 'not-a-uuid' }) });
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('treats a malformed trusted renewal response as a service failure', async () => {
    mocks.single.mockResolvedValueOnce({ data: { invitation_id: invitationId }, error: null });
    const response = await PATCH(
      new NextRequest(`https://modelops.test/api/organization/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend' }),
      }),
      { params: Promise.resolve({ id: invitationId }) },
    );
    expect(response.status).toBe(503);
    expect(mocks.deliver).not.toHaveBeenCalled();
  });
});
