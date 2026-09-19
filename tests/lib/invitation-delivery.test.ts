import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadInvitationLinks(appUrl: string | undefined, nodeEnv: string) {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', nodeEnv);
  vi.stubEnv('NEXT_PUBLIC_APP_URL', appUrl ?? '');
  return (await import('../../src/lib/auth/invitation-delivery')).invitationLinks;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('invitation link origin policy', () => {
  const invitationId = '63950e1e-3f72-4bf0-a5ac-fc06699ae500';

  it('uses the configured canonical HTTPS origin in production', async () => {
    const invitationLinks = await loadInvitationLinks('https://model-ops.vercel.app', 'production');
    const links = invitationLinks('https://untrusted-request.example/api/organization/invitations', invitationId);

    expect(links.acceptanceUrl).toBe(`https://model-ops.vercel.app/invite/accept?invitation=${invitationId}`);
    expect(links.callbackUrl).toContain('https://model-ops.vercel.app/auth/callback?');
    expect(links.callbackUrl).not.toContain('untrusted-request.example');
  });

  it('fails closed when the canonical production URL is missing', async () => {
    const invitationLinks = await loadInvitationLinks(undefined, 'production');
    expect(() => invitationLinks('https://request.example/api/organization/invitations', invitationId))
      .toThrow('APP_URL_CONFIGURATION_MISSING');
  });

  it('requires HTTPS for production invitation links', async () => {
    const invitationLinks = await loadInvitationLinks('http://modelops.example', 'production');
    expect(() => invitationLinks('https://request.example/api/organization/invitations', invitationId))
      .toThrow('APP_URL_HTTPS_REQUIRED');
  });

  it('allows the request origin only outside production', async () => {
    const invitationLinks = await loadInvitationLinks(undefined, 'test');
    const links = invitationLinks('http://localhost:3000/api/organization/invitations', invitationId);
    expect(links.acceptanceUrl).toBe(`http://localhost:3000/invite/accept?invitation=${invitationId}`);
  });
});
