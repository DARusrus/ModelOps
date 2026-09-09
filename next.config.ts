import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs/config';

const nextConfig: NextConfig = {
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
    ];
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

// Source maps are uploaded only in a trusted build environment. The browser
// DSN never grants this capability, and no maps are published if the build
// credentials are absent.
const sentryRelease = process.env.SENTRY_RELEASE;
const sourceMapUploadConfigured = Boolean(
  process.env.SENTRY_ORG
  && process.env.SENTRY_PROJECT
  && process.env.SENTRY_AUTH_TOKEN
  && sentryRelease
  // The uploaded artifacts and browser events must identify the same release.
  && sentryRelease === process.env.NEXT_PUBLIC_SENTRY_RELEASE
);

export default sourceMapUploadConfigured
  ? withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: true,
    release: { name: sentryRelease },
    sourcemaps: { deleteSourcemapsAfterUpload: true },
  })
  : nextConfig;
