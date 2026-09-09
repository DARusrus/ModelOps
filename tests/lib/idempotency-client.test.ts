import { describe, expect, it } from 'vitest';
import { clearStableReviewIdempotencyKey, stableReviewIdempotencyKey } from '../../src/lib/idempotency-client';

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
}

describe('durable review retry keys', () => {
  it('reuses an opaque review key after a page reload within the server retry window', () => {
    const storage = memoryStorage();
    const first = stableReviewIdempotencyKey(storage, 'card-1.approved.enterprise_general', 1_000);
    const afterReload = stableReviewIdempotencyKey(storage, 'card-1.approved.enterprise_general', 2_000);
    expect(afterReload).toBe(first);
  });

  it('does not retain the key after a confirmed response or after the retry window', () => {
    const storage = memoryStorage();
    const first = stableReviewIdempotencyKey(storage, 'card-1.approved.enterprise_general', 1_000);
    clearStableReviewIdempotencyKey(storage, 'card-1.approved.enterprise_general');
    expect(stableReviewIdempotencyKey(storage, 'card-1.approved.enterprise_general', 2_000)).not.toBe(first);
    const second = stableReviewIdempotencyKey(storage, 'card-2.approved.enterprise_general', 1_000);
    expect(stableReviewIdempotencyKey(storage, 'card-2.approved.enterprise_general', 1_000 + 86_400_000)).not.toBe(second);
  });
});
