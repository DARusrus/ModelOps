const REVIEW_RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = 'modelops.review-idempotency.';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type StoredKey = { key: string; createdAt: number };

function storageKey(scope: string) {
  return `${STORAGE_PREFIX}${scope}`;
}

/**
 * Keeps only an opaque UUID in browser storage. A retry after reload therefore
 * reuses the server-side idempotency record without retaining a review reason,
 * evidence, or model-card contents in the browser.
 */
export function stableReviewIdempotencyKey(storage: StorageLike, scope: string, now = Date.now()): string {
  const key = storageKey(scope);
  try {
    const existing = JSON.parse(storage.getItem(key) || 'null') as StoredKey | null;
    if (existing && typeof existing.key === 'string' && Number.isFinite(existing.createdAt) && now - existing.createdAt >= 0 && now - existing.createdAt < REVIEW_RETRY_WINDOW_MS) {
      return existing.key;
    }
  } catch {
    // Corrupt browser state is discarded by overwriting it below.
  }
  const value = { key: crypto.randomUUID(), createdAt: now };
  storage.setItem(key, JSON.stringify(value));
  return value.key;
}

export function clearStableReviewIdempotencyKey(storage: StorageLike, scope: string) {
  storage.removeItem(storageKey(scope));
}
