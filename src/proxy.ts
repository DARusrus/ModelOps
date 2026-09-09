import { NextResponse, type NextRequest } from 'next/server';

function contentSecurityPolicy(nonce: string, isDevelopment: boolean) {
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : '';
  let sentryOrigin = '';
  try {
    sentryOrigin = process.env.NEXT_PUBLIC_SENTRY_DSN
      ? new URL(process.env.NEXT_PUBLIC_SENTRY_DSN).origin
      : '';
  } catch {
    // A malformed optional DSN must not weaken CSP or prevent the app serving.
  }
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    `style-src 'self'${isDevelopment ? " 'unsafe-inline'" : ` 'nonce-${nonce}'`}`,
    `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ''}${sentryOrigin ? ` ${sentryOrigin}` : ''}`,
    'upgrade-insecure-requests',
  ].join('; ');
}

/**
 * Creates a request-scoped CSP nonce before React renders. Next reads the CSP
 * request header and applies the nonce to its framework-generated tags.
 */
export function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const isApiRequest = request.nextUrl.pathname.startsWith('/api/');
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === 'development');
  const requestHeaders = new Headers(request.headers);
  // Do not trust a client-provided correlation ID. A new server-generated ID
  // makes the header safe to use as a log correlation key.
  requestHeaders.set('x-request-id', requestId);
  if (!isApiRequest) {
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', policy);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('X-Request-Id', requestId);
  if (!isApiRequest) response.headers.set('Content-Security-Policy', policy);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
