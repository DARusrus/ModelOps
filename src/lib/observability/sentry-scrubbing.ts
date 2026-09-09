import type { ErrorEvent } from '@sentry/nextjs';
import type { TransactionEvent } from '@sentry/core';

/**
 * Model cards can contain governance evidence and personal information. Events
 * retain operational tags and stack frames, but never send request/user data.
 */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  return {
    ...event,
    message: event.message ? 'Captured application error' : event.message,
    user: undefined,
    request: undefined,
    breadcrumbs: undefined,
    extra: undefined,
    exception: event.exception
      ? {
        ...event.exception,
        values: event.exception.values?.map((value) => ({ ...value, value: '[redacted]' })),
      }
      : undefined,
  };
}

/** Traces retain timing and route information only; request payloads are removed. */
export function scrubSentryTransaction(event: TransactionEvent): TransactionEvent {
  return { ...event, request: undefined };
}
