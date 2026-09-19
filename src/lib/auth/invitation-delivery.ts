import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createTimeoutFetch } from '@/lib/network/timeout';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

function publicAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { fetch: createTimeoutFetch(env.DATABASE_REQUEST_TIMEOUT_MS) },
    },
  );
}

export function invitationLinks(requestUrl: string, invitationId: string) {
  const requestOrigin = new URL(requestUrl).origin;
  const configuredUrl = env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl && process.env.NODE_ENV === 'production') {
    throw new Error('APP_URL_CONFIGURATION_MISSING');
  }
  const appOrigin = configuredUrl ? new URL(configuredUrl).origin : requestOrigin;
  if (process.env.NODE_ENV === 'production' && new URL(appOrigin).protocol !== 'https:') {
    throw new Error('APP_URL_HTTPS_REQUIRED');
  }
  const acceptance = new URL('/invite/accept', appOrigin);
  acceptance.searchParams.set('invitation', invitationId);
  const callback = new URL('/auth/callback', appOrigin);
  callback.searchParams.set('next', `${acceptance.pathname}${acceptance.search}`);
  return { acceptanceUrl: acceptance.toString(), callbackUrl: callback.toString() };
}

export async function deliverOrganizationInvitation(email: string, callbackUrl: string, recipientExists: boolean) {
  try {
    const result = recipientExists
      ? await publicAuthClient().auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: callbackUrl },
      })
      : await createSupabaseAdminClient().auth.admin.inviteUserByEmail(email, { redirectTo: callbackUrl });
    if (!result.error) return 'sent' as const;
    logger.warn('Organization invitation email requires manual delivery', { recipient_type: recipientExists ? 'existing' : 'new' });
  } catch (error) {
    logger.warn('Organization invitation email requires manual delivery', { error_type: error instanceof Error ? error.name : 'UNKNOWN' });
  }
  return 'manual_required' as const;
}
