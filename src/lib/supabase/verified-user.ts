import 'server-only';
import { isAuthRetryableFetchError, type SupabaseClient, type User } from '@supabase/supabase-js';
import { abortableDelay } from '@/lib/network/timeout';

/**
 * Verifies the current server session and retries one transient Auth transport
 * failure. Invalid or expired credentials still fail closed immediately.
 */
export async function getVerifiedUser(supabase: SupabaseClient): Promise<User | null> {
  let result = await supabase.auth.getUser();
  if (isAuthRetryableFetchError(result.error)) {
    await abortableDelay(100);
    result = await supabase.auth.getUser();
  }
  return result.error ? null : result.data.user;
}
