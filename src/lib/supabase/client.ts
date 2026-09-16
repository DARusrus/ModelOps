'use client';

import { createBrowserClient } from '@supabase/ssr';
import { createTimeoutFetch } from '@/lib/network/timeout';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { fetch: createTimeoutFetch(15_000) } },
  );
}
