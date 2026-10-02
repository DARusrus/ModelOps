'use client';

import {
  isAuthRetryableFetchError,
  type SignInWithPasswordCredentials,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { abortableDelay } from '@/lib/network/timeout';

/**
 * Retries one password sign-in only when Supabase identifies a transient
 * transport failure. Credential and policy errors are returned immediately.
 */
export async function signInWithPassword(
  supabase: SupabaseClient,
  credentials: SignInWithPasswordCredentials,
) {
  let result = await supabase.auth.signInWithPassword(credentials);
  if (isAuthRetryableFetchError(result.error)) {
    await abortableDelay(250);
    result = await supabase.auth.signInWithPassword(credentials);
  }
  return result;
}

export function isTemporarySignInFailure(error: unknown): boolean {
  return isAuthRetryableFetchError(error);
}
