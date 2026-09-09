import 'server-only';
import { createClient } from '@supabase/supabase-js';

/** Server-only client for narrowly scoped operations that cannot safely depend
 * on a database RPC inheriting browser JWT context. Never import in client UI. */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error('SUPABASE_ADMIN_CONFIGURATION_MISSING');
  return createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
