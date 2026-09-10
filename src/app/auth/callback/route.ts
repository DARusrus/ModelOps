import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { withRequestId } from '@/lib/http';
import { env } from '@/lib/env';
import { createTimeoutFetch } from '@/lib/network/timeout';

async function get(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const response = NextResponse.redirect(new URL('/modelops', url.origin));
  if (!code) {
    response.headers.set('Location', new URL('/login?error=missing_callback_code', url.origin).toString());
    return response;
  }
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { fetch: createTimeoutFetch(env.DATABASE_REQUEST_TIMEOUT_MS) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) response.headers.set('Location', new URL('/login?error=session_exchange_failed', url.origin).toString());
  return response;
}

export const GET = withRequestId(get);
