import {
  AuthApiError,
  AuthRetryableFetchError,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { isTemporarySignInFailure, signInWithPassword } from '../../src/lib/supabase/password-auth';

function clientWith(signIn: ReturnType<typeof vi.fn>) {
  return { auth: { signInWithPassword: signIn } } as unknown as SupabaseClient;
}

const credentials = { email: 'person@example.test', password: 'not-a-real-password' };

describe('password authentication transport policy', () => {
  it('retries one retryable transport failure', async () => {
    const session = { access_token: 'test-token' };
    const signIn = vi.fn()
      .mockResolvedValueOnce({ data: { user: null, session: null }, error: new AuthRetryableFetchError('network failed', 0) })
      .mockResolvedValueOnce({ data: { user: null, session }, error: null });

    await expect(signInWithPassword(clientWith(signIn), credentials)).resolves.toEqual({
      data: { user: null, session },
      error: null,
    });
    expect(signIn).toHaveBeenCalledTimes(2);
  });

  it('returns credential failures without retrying', async () => {
    const error = new AuthApiError('invalid credentials', 400, 'invalid_credentials');
    const signIn = vi.fn().mockResolvedValue({ data: { user: null, session: null }, error });

    await expect(signInWithPassword(clientWith(signIn), credentials)).resolves.toMatchObject({ error });
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(isTemporarySignInFailure(error)).toBe(false);
  });

  it('stops after one retry and classifies continued transport failure as temporary', async () => {
    const error = new AuthRetryableFetchError('network failed', 0);
    const signIn = vi.fn().mockResolvedValue({ data: { user: null, session: null }, error });

    await expect(signInWithPassword(clientWith(signIn), credentials)).resolves.toMatchObject({ error });
    expect(signIn).toHaveBeenCalledTimes(2);
    expect(isTemporarySignInFailure(error)).toBe(true);
  });
});
