import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { createTimeoutFetch } from '@/lib/network/timeout';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: createTimeoutFetch(env.DATABASE_REQUEST_TIMEOUT_MS) },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items) => {
          try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* Server Components cannot set cookies. */ }
        },
      },
    }
  );
}
