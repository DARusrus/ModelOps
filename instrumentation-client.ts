import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent, scrubSentryTransaction } from './src/lib/observability/sentry-scrubbing';

function traceSampleRate(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0.05;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  sendDefaultPii: false,
  tracesSampleRate: traceSampleRate(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE),
  beforeSend: scrubSentryEvent,
  beforeSendTransaction: scrubSentryTransaction,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
