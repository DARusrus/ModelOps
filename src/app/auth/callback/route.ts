import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { withRequestId } from '@/lib/http';

async function get(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const response = NextResponse.redirect(new URL('/modelops', url.origin));
  if (!code) return response;
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => request.headers.get('cookie')?.split('; ').filter(Boolean).map((part) => { const [name, ...rest] = part.split('='); return { name, value: rest.join('=') }; }) ?? [], setAll: (items) => items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) },
  });
  await supabase.auth.exchangeCodeForSession(code);
  return response;
}

export const GET = withRequestId(get);
