import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  actor: vi.fn(), rpc: vi.fn(), single: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(),
  deliver: vi.fn(), links: vi.fn(), getUser: vi.fn(), sessionRpc: vi.fn(), sessionSingle: vi.fn(),
}));
vi.mock('../../src/lib/auth/actor', () => ({ requireDefaultActor: mocks.actor }));
vi.mock('../../src/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ rpc: mocks.rpc, from: mocks.from }) }));
vi.mock('../../src/lib/supabase/server', () => ({ createSupabaseServerClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.sessionRpc }) }));
vi.mock('../../src/lib/auth/invitation-delivery', () => ({ deliverOrganizationInvitation: mocks.deliver, invitationLinks: mocks.links }));

import { GET, POST } from '../../src/app/api/organization/invitations/route';
import { POST as ACCEPT } from '../../src/app/api/organization/invitations/[id]/accept/route';

const invitationId = '63950e1e-3f72-4bf0-a5ac-fc06699ae500';
const organizationId = '18caec45-8054-4fdf-bd91-25fb38d3fd61';
const actor = { userId: '1133a8ae-6426-40f0-b09e-3da587b66e16', organizationId, role: 'admin' };
const now = new Date().toISOString();

describe('organization invitation APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.mockResolvedValue(actor);
    mocks.links.mockReturnValue({ acceptanceUrl: `https://modelops.test/invite/accept?invitation=${invitationId}`, callbackUrl: 'https://modelops.test/auth/callback?next=invite' });
    mocks.deliver.mockResolvedValue('sent');
    mocks.rpc.mockReturnValue({ single: mocks.single });
    mocks.single.mockResolvedValue({ data: { invitation_id: invitationId, invitation_email: 'reviewer@example.test', invitation_role: 'reviewer', invitation_expires_at: now, invitation_created_at: now, recipient_exists: true }, error: null });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ order: mocks.order });
    mocks.order.mockReturnValue({ limit: mocks.limit });
    mocks.limit.mockResolvedValue({ data: [], error: null });
    mocks.getUser.mockResolvedValue({ data: { user: { id: actor.userId } } });
    mocks.sessionRpc.mockReturnValue({ single: mocks.sessionSingle });
    mocks.sessionSingle.mockResolvedValue({ data: { organization_id: organizationId, organization_name: 'Model Governance', organization_role: 'reviewer', accepted: true }, error: null });
  });

  it('creates a normalized, server-scoped invitation and reports delivery', async () => {
    const response = await POST(new NextRequest('https://modelops.test/api/organization/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ' Reviewer@Example.Test ', role: 'reviewer' }) }));
    expect(response.status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith('create_organization_invitation_as', expect.objectContaining({ requesting_actor: actor.userId, target_organization: organizationId, target_email: 'reviewer@example.test', requested_role: 'reviewer' }));
    expect(mocks.deliver).toHaveBeenCalledWith('reviewer@example.test', expect.any(String), true);
    await expect(response.json()).resolves.toMatchObject({ success: true, delivery: 'sent', invitation: { id: invitationId, role: 'reviewer' } });
  });

  it('rejects invalid input before any privileged mutation', async () => {
    const response = await POST(new NextRequest('https://modelops.test/api/organization/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'not-email', role: 'owner' }) }));
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('lists invitations only through the authenticated active organization', async () => {
    const response = await GET(new NextRequest('https://modelops.test/api/organization/invitations'));
    expect(response.status).toBe(200);
    expect(mocks.eq).toHaveBeenCalledWith('organization_id', organizationId);
  });

  it('accepts through the session-bound RPC and activates the organization', async () => {
    const response = await ACCEPT(new NextRequest(`https://modelops.test/api/organization/invitations/${invitationId}/accept`, { method: 'POST' }), { params: Promise.resolve({ id: invitationId }) });
    expect(response.status).toBe(200);
    expect(mocks.sessionRpc).toHaveBeenCalledWith('accept_organization_invitation', { target_invitation: invitationId });
    expect(response.headers.get('set-cookie')).toContain(`modelops-active-organization=${organizationId}`);
  });

  it('does not invoke acceptance without an authenticated session', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
    const response = await ACCEPT(new NextRequest(`https://modelops.test/api/organization/invitations/${invitationId}/accept`, { method: 'POST' }), { params: Promise.resolve({ id: invitationId }) });
    expect(response.status).toBe(401);
    expect(mocks.sessionRpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid invitation identifier before opening a session', async () => {
    const response = await ACCEPT(
      new NextRequest('https://modelops.test/api/organization/invitations/not-a-uuid/accept', { method: 'POST' }),
      { params: Promise.resolve({ id: 'not-a-uuid' }) },
    );
    expect(response.status).toBe(400);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.sessionRpc).not.toHaveBeenCalled();
  });

  it('maps an expired invitation to a non-retryable gone response', async () => {
    mocks.sessionSingle.mockResolvedValueOnce({ data: null, error: { message: 'INVITATION_EXPIRED' } });
    const response = await ACCEPT(
      new NextRequest(`https://modelops.test/api/organization/invitations/${invitationId}/accept`, { method: 'POST' }),
      { params: Promise.resolve({ id: invitationId }) },
    );
    expect(response.status).toBe(410);
  });

  it('treats a malformed trusted acceptance response as a service failure', async () => {
    mocks.sessionSingle.mockResolvedValueOnce({ data: { organization_id: organizationId }, error: null });
    const response = await ACCEPT(
      new NextRequest(`https://modelops.test/api/organization/invitations/${invitationId}/accept`, { method: 'POST' }),
      { params: Promise.resolve({ id: invitationId }) },
    );
    expect(response.status).toBe(503);
  });
});
