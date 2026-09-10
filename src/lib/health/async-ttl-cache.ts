/** Small warm-instance cache with promise coalescing. It limits repeated health
 * probes without claiming to be a cross-instance cache or source of truth. */
export function createAsyncTtlCache<T>(loader: () => Promise<T>, ttlMs: number, now: () => number = () => Date.now()) {
  let cached: { value: T; expiresAt: number } | undefined;
  let inFlight: Promise<T> | undefined;

  return async (): Promise<T> => {
    const currentTime = now();
    if (cached && currentTime < cached.expiresAt) return cached.value;
    if (inFlight) return inFlight;

    inFlight = loader().then((value) => {
      cached = { value, expiresAt: now() + ttlMs };
      return value;
    }).finally(() => {
      inFlight = undefined;
    });
    return inFlight;
  };
}
