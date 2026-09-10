import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const authMocks = vi.hoisted(() => ({ getClaims: vi.fn(), cookieOptions: undefined as undefined | { setAll: (items: Array<{ name: string; value: string; options: Record<string, unknown> }>) => void } }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url, _key, options) => {
    authMocks.cookieOptions = options.cookies;
    return { auth: { getClaims: authMocks.getClaims } };
  }),
}));
import { proxy } from '../../src/proxy';

describe('CSP proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-test-key';
    authMocks.getClaims.mockResolvedValue({ data: { claims: null }, error: null });
  });

  it('creates a per-request nonce CSP without production unsafe directives', async () => {
    const response = await proxy(new NextRequest('https://modelops.example.test/login'));
    const policy = response.headers.get('Content-Security-Policy') || '';
    const requestNonce = response.headers.get('x-nonce');

    expect(policy).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(policy).toMatch(/style-src 'self' 'nonce-[^']+'/);
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(requestNonce).toBeNull();
    expect(response.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);
    expect(authMocks.getClaims).toHaveBeenCalledOnce();
  });

  it('produces independent nonces for separate responses', async () => {
    const first = (await proxy(new NextRequest('https://modelops.example.test/login'))).headers.get('Content-Security-Policy');
    const second = (await proxy(new NextRequest('https://modelops.example.test/login'))).headers.get('Content-Security-Policy');
    expect(first).not.toBe(second);
  });

  it('adds an unspoofable correlation header to API responses without a document CSP', async () => {
    const response = await proxy(new NextRequest('https://modelops.example.test/api/modelops', { headers: { 'x-request-id': 'client-controlled' } }));
    expect(response.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get('X-Request-Id')).not.toBe('client-controlled');
    expect(response.headers.get('Content-Security-Policy')).toBeNull();
  });

  it('allows browser reporting only to the configured Sentry ingest origin', async () => {
    const previousDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://public@example.ingest.sentry.io/123';
    const response = await proxy(new NextRequest('https://modelops.example.test/login'));
    expect(response.headers.get('Content-Security-Policy')).toContain('https://example.ingest.sentry.io');
    if (previousDsn === undefined) delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    else process.env.NEXT_PUBLIC_SENTRY_DSN = previousDsn;
  });

  it('allows a valid regional Sentry ingest origin', async () => {
    const previousDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://public@o123.ingest.de.sentry.io/456';
    const response = await proxy(new NextRequest('https://modelops.example.test/login'));
    expect(response.headers.get('Content-Security-Policy')).toContain('https://o123.ingest.de.sentry.io');
    if (previousDsn === undefined) delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    else process.env.NEXT_PUBLIC_SENTRY_DSN = previousDsn;
  });

  it('forwards refreshed auth cookies to the application and browser response', async () => {
    authMocks.getClaims.mockImplementationOnce(async () => {
      authMocks.cookieOptions?.setAll([{ name: 'sb-session', value: 'refreshed', options: { httpOnly: true, path: '/' } }]);
      return { data: { claims: { sub: 'user-1' } }, error: null };
    });

    const response = await proxy(new NextRequest('https://modelops.example.test/modelops'));

    expect(response.cookies.get('sb-session')?.value).toBe('refreshed');
    expect(response.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
  });
});
