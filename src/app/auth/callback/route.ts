import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { withRequestId } from '@/lib/http';
import { env } from '@/lib/env';
import { createTimeoutFetch } from '@/lib/network/timeout';
import { PASSWORD_RECOVERY_COOKIE, safeAuthContinuation } from '@/lib/auth/continuation';

async function get(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const continuation = safeAuthContinuation(url.searchParams.get('next'));
  const response = NextResponse.redirect(new URL(continuation, url.origin));
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  if (!code) {
    response.headers.set('Location', new URL('/login?error=missing_callback_code', url.origin).toString());
    return response;
  }
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { fetch: createTimeoutFetch(env.DATABASE_REQUEST_TIMEOUT_MS) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items, headers) => {
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    response.headers.set('Location', new URL('/login?error=session_exchange_failed', url.origin).toString());
  } else if (continuation === '/reset-password') {
    response.cookies.set(PASSWORD_RECOVERY_COOKIE, '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/reset-password',
      maxAge: 10 * 60,
    });
  }
  return response;
}

export const GET = withRequestId(get);
