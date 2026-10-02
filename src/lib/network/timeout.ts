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

/** Managed-service JSON responses are bounded through body consumption, not just headers.
 * Buffering is intentional here: this adapter is not for streaming exports or SSE. */
export function createTimeoutFetch(timeoutMs: number, baseFetch: typeof fetch = globalThis.fetch, maxResponseBytes = 5 * 1024 * 1024): typeof fetch {
  return async (input, init) => {
    const deadline = createAbortDeadline(timeoutMs, init?.signal);
    try {
      const response = await baseFetch(input, { ...init, signal: deadline.signal });
      // Browsers may expose an empty stream even when HTTP forbids a body.
      if (!response.body || [204, 205, 304].includes(response.status)) return response;
      const reader = response.body.getReader();
      const cancel = () => { void reader.cancel(deadline.signal.reason).catch(() => undefined); };
      deadline.signal.addEventListener('abort', cancel, { once: true });
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        if (deadline.signal.aborted) throw deadline.signal.reason;
        while (true) {
          const chunk = await reader.read();
          if (deadline.signal.aborted) throw deadline.signal.reason;
          if (chunk.done) break;
          length += chunk.value.byteLength;
          if (length > maxResponseBytes) {
            void reader.cancel().catch(() => undefined);
            throw new Error('MANAGED_RESPONSE_TOO_LARGE');
          }
          chunks.push(chunk.value);
        }
      } finally {
        deadline.signal.removeEventListener('abort', cancel);
        reader.releaseLock();
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      const buffered = new Response(bytes, { status: response.status, statusText: response.statusText, headers: response.headers });
      Object.defineProperties(buffered, {
        url: { value: response.url }, redirected: { value: response.redirected }, type: { value: response.type },
      });
      return buffered;
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
