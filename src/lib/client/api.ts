import { createAbortDeadline } from '@/lib/network/timeout';

const DEFAULT_CLIENT_TIMEOUT_MS = 15_000;

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function requestJson<T>(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = DEFAULT_CLIENT_TIMEOUT_MS): Promise<T> {
  const deadline = createAbortDeadline(timeoutMs, init.signal);
  try {
    const response = await fetch(input, { ...init, signal: deadline.signal });
    const text = await response.text();
    let body: unknown = {};
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        throw new ApiClientError('The server returned an invalid response.', response.status || 502, 'INVALID_RESPONSE');
      }
    }
    if (!response.ok) {
      const errorBody = body && typeof body === 'object' ? body as { error?: unknown; code?: unknown; details?: unknown } : {};
      throw new ApiClientError(
        typeof errorBody.error === 'string' ? errorBody.error : `Server responded with status ${response.status}`,
        response.status,
        typeof errorBody.code === 'string' ? errorBody.code : undefined,
        Array.isArray(errorBody.details) ? errorBody.details as Array<{ path: string; message: string }> : undefined,
      );
    }
    return body as T;
  } catch (error) {
    if (deadline.didTimeout()) throw new ApiClientError('The request timed out. Please try again.', 408, 'CLIENT_TIMEOUT');
    throw error;
  } finally {
    deadline.dispose();
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
