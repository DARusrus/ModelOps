import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), single: vi.fn() }));
vi.mock('../../src/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  })),
}));

import { POST } from '../../src/app/api/organization/onboarding/route';

function request(body: unknown) {
  return new NextRequest('https://modelops.example.test/api/organization/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/organization/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'actor-1' } } });
    mocks.rpc.mockReturnValue({ single: mocks.single });
    mocks.single.mockResolvedValue({
      data: {
        organization_id: '2f7d34c1-e4dc-4c61-96d3-bf245ec992af',
        organization_name: 'Model Governance',
        organization_role: 'admin',
        created: true,
      },
      error: null,
    });
  });

  it('creates the actor-owned workspace and activates it', async () => {
    const response = await POST(request({ workspace_name: '  Model Governance  ' }));
    expect(response.status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith('create_initial_workspace', { workspace_name: 'Model Governance' });
    expect(response.headers.get('set-cookie')).toContain('modelops-active-organization=2f7d34c1-e4dc-4c61-96d3-bf245ec992af');
    await expect(response.json()).resolves.toMatchObject({ success: true, name: 'Model Governance', role: 'admin', created: true });
  });

  it('returns an idempotent replay without creating a second workspace', async () => {
    mocks.single.mockResolvedValueOnce({
      data: {
        organization_id: '2f7d34c1-e4dc-4c61-96d3-bf245ec992af',
        organization_name: 'Model Governance',
        organization_role: 'admin',
        created: false,
      },
      error: null,
    });
    const response = await POST(request({ workspace_name: 'Different ignored name' }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, created: false, name: 'Model Governance' });
  });

  it('rejects unauthenticated and invalid requests before invoking the trusted function', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
    expect((await POST(request({ workspace_name: 'Model Governance' }))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();

    vi.clearAllMocks();
    const invalid = await POST(request({ workspace_name: '', role: 'admin' }));
    expect(invalid.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('does not expose database errors', async () => {
    mocks.single.mockResolvedValueOnce({ data: null, error: { message: 'private database failure' } });
    const response = await POST(request({ workspace_name: 'Model Governance' }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private database failure');
  });
});
