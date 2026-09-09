import { describe, expect, it } from 'vitest';
import { scrubSentryEvent, scrubSentryTransaction } from '../../src/lib/observability/sentry-scrubbing';

describe('Sentry privacy boundary', () => {
  it('removes request, user, breadcrumb, extra, and exception-message data', () => {
    const event = scrubSentryEvent({
      type: undefined,
      message: 'model-card payload leaked',
      user: { email: 'person@example.test' },
      request: { data: { model_name: 'sensitive-model' }, cookies: { session: 'secret' } },
      breadcrumbs: [{ message: 'entered sensitive evidence' }],
      extra: { payload: { evidence: 'private' } },
      exception: { values: [{ type: 'Error', value: 'private upstream message' }] },
    });
    expect(event.message).toBe('Captured application error');
    expect(event.user).toBeUndefined();
    expect(event.request).toBeUndefined();
    expect(event.breadcrumbs).toBeUndefined();
    expect(event.extra).toBeUndefined();
    expect(event.exception?.values?.[0].value).toBe('[redacted]');
  });

  it('removes request data from performance transactions', () => {
    const event = scrubSentryTransaction({ type: 'transaction', transaction: '/api/modelops', request: { data: { model_name: 'private' } } });
    expect(event.request).toBeUndefined();
    expect(event.transaction).toBe('/api/modelops');
  });
});
