import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '../../src/proxy';

describe('CSP proxy', () => {
  it('creates a per-request nonce CSP without production unsafe directives', () => {
    const response = proxy(new NextRequest('https://modelops.example.test/login'));
    const policy = response.headers.get('Content-Security-Policy') || '';
    const requestNonce = response.headers.get('x-nonce');

    expect(policy).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(policy).toMatch(/style-src 'self' 'nonce-[^']+'/);
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(requestNonce).toBeNull();
    expect(response.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('produces independent nonces for separate responses', () => {
    const first = proxy(new NextRequest('https://modelops.example.test/login')).headers.get('Content-Security-Policy');
    const second = proxy(new NextRequest('https://modelops.example.test/login')).headers.get('Content-Security-Policy');
    expect(first).not.toBe(second);
  });

  it('adds an unspoofable correlation header to API responses without a document CSP', () => {
    const response = proxy(new NextRequest('https://modelops.example.test/api/modelops', { headers: { 'x-request-id': 'client-controlled' } }));
    expect(response.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get('X-Request-Id')).not.toBe('client-controlled');
    expect(response.headers.get('Content-Security-Policy')).toBeNull();
  });

  it('allows browser reporting only to the configured Sentry ingest origin', () => {
    const previousDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://public@example.ingest.sentry.io/123';
    const response = proxy(new NextRequest('https://modelops.example.test/login'));
    expect(response.headers.get('Content-Security-Policy')).toContain('connect-src \'self\' https://example.ingest.sentry.io');
    if (previousDsn === undefined) delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    else process.env.NEXT_PUBLIC_SENTRY_DSN = previousDsn;
  });

  it('allows a valid regional Sentry ingest origin', () => {
    const previousDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://public@o123.ingest.de.sentry.io/456';
    const response = proxy(new NextRequest('https://modelops.example.test/login'));
    expect(response.headers.get('Content-Security-Policy')).toContain('connect-src \'self\' https://o123.ingest.de.sentry.io');
    if (previousDsn === undefined) delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    else process.env.NEXT_PUBLIC_SENTRY_DSN = previousDsn;
  });
});
