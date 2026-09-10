export type AbortDeadline = {
  signal: AbortSignal;
  didTimeout: () => boolean;
  dispose: () => void;
};

/** Creates a bounded signal while preserving cancellation from its caller. */
export function createAbortDeadline(timeoutMs: number, parent?: AbortSignal | null): AbortDeadline {
  const controller = new AbortController();
  let timedOut = false;
  const onParentAbort = () => controller.abort(parent?.reason);

  if (parent?.aborted) controller.abort(parent.reason);
  else parent?.addEventListener('abort', onParentAbort, { once: true });

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Operation timed out', 'TimeoutError'));
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    dispose: () => {
      clearTimeout(timer);
      parent?.removeEventListener('abort', onParentAbort);
    },
  };
}

/** Fetch adapter used at managed-service boundaries so a stalled connection
 * cannot occupy a server invocation indefinitely. */
export function createTimeoutFetch(timeoutMs: number, baseFetch: typeof fetch = globalThis.fetch): typeof fetch {
  return async (input, init) => {
    const deadline = createAbortDeadline(timeoutMs, init?.signal);
    try {
      return await baseFetch(input, { ...init, signal: deadline.signal });
    } finally {
      deadline.dispose();
    }
  };
}

export function abortableDelay(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(signal.reason ?? new DOMException('Operation aborted', 'AbortError'));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException('Operation aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
