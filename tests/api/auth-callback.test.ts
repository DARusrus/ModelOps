import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ exchange: vi.fn() }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: { exchangeCodeForSession: mocks.exchange } })),
}));
import { GET } from '../../src/app/auth/callback/route';

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exchange.mockResolvedValue({ error: null });
  });

  it('exchanges a valid code and redirects to the protected workspace', async () => {
    const response = await GET(new NextRequest('https://modelops.example.test/auth/callback?code=valid-code'));
    expect(mocks.exchange).toHaveBeenCalledWith('valid-code');
    expect(response.headers.get('location')).toBe('https://modelops.example.test/modelops');
  });

  it('returns to sign-in without exposing provider details when exchange fails', async () => {
    mocks.exchange.mockResolvedValue({ error: { message: 'private provider failure' } });
    const response = await GET(new NextRequest('https://modelops.example.test/auth/callback?code=invalid-code'));
    expect(response.headers.get('location')).toBe('https://modelops.example.test/login?error=session_exchange_failed');
    expect(await response.text()).not.toContain('private provider failure');
  });

  it('does not call Supabase when the callback code is absent', async () => {
    const response = await GET(new NextRequest('https://modelops.example.test/auth/callback'));
    expect(mocks.exchange).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe('https://modelops.example.test/login?error=missing_callback_code');
  });
});
