import { AuthApiError, AuthRetryableFetchError, type SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { getVerifiedUser } from '../../src/lib/supabase/verified-user';

function clientWith(getUser: ReturnType<typeof vi.fn>) {
  return { auth: { getUser } } as unknown as SupabaseClient;
}

describe('getVerifiedUser', () => {
  it('retries one retryable Auth transport failure and returns the verified user', async () => {
    const user = { id: 'user-1' };
    const getUser = vi.fn()
      .mockResolvedValueOnce({ data: { user: null }, error: new AuthRetryableFetchError('timed out', 0) })
      .mockResolvedValueOnce({ data: { user }, error: null });

    await expect(getVerifiedUser(clientWith(getUser))).resolves.toBe(user);
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it('does not retry invalid credentials and fails closed', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: new AuthApiError('invalid token', 401, 'bad_jwt'),
    });

    await expect(getVerifiedUser(clientWith(getUser))).resolves.toBeNull();
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it('stops after one retry when Auth remains unavailable', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: new AuthRetryableFetchError('timed out', 0),
    });

    await expect(getVerifiedUser(clientWith(getUser))).resolves.toBeNull();
    expect(getUser).toHaveBeenCalledTimes(2);
  });
});
