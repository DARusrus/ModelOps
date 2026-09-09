import { NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/modelops/validators';
import { logger } from '@/lib/logger';
import { withRequestLogContext } from '@/lib/observability/request-context';

export const MAX_JSON_BODY_BYTES = 64 * 1024;
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * API routes receive a server-generated ID from src/proxy.ts. The fallback
 * keeps direct unit calls observable without accepting arbitrary input.
 */
export function responseRequestId(request: Request) {
  const requestId = request.headers.get('x-request-id');
  return requestId && REQUEST_ID_PATTERN.test(requestId) ? requestId : crypto.randomUUID();
}

export function withRequestId<T extends [Request, ...unknown[]]>(handler: (...args: T) => Response | Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    const request = args[0];
    const requestId = responseRequestId(request);
    const startedAt = Date.now();
    return withRequestLogContext({ request_id: requestId, route: new URL(request.url).pathname, method: request.method }, async () => {
      try {
        const response = await handler(...args);
        response.headers.set('X-Request-Id', requestId);
        logger.info('HTTP request completed', { status: response.status, duration_ms: Date.now() - startedAt });
        return response;
      } catch (error) {
        logger.error('HTTP request failed', { error_type: error instanceof Error ? error.name : 'UNKNOWN', duration_ms: Date.now() - startedAt });
        throw error;
      }
    });
  };
}

export function requireJsonRequest(request: Request): NextResponse | undefined {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) {
    return createErrorResponse('Content-Type must be application/json', 415, undefined, 'UNSUPPORTED_MEDIA_TYPE');
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_JSON_BODY_BYTES) {
    return createErrorResponse('Request body exceeds the 64 KiB limit', 413, undefined, 'PAYLOAD_TOO_LARGE');
  }
  return undefined;
}

/**
 * Reads JSON with an enforced stream limit. Content-Length is only an early
 * rejection hint: HTTP/2, chunked requests, and malicious clients may omit it.
 */
export async function readJsonRequest(request: Request): Promise<{ body: unknown } | { error: NextResponse }> {
  const invalidRequest = requireJsonRequest(request);
  if (invalidRequest) return { error: invalidRequest };
  if (!request.body) return { error: createErrorResponse('Invalid JSON payload provided in request body', 400, undefined, 'INVALID_JSON') };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_JSON_BODY_BYTES) {
        await reader.cancel();
        return { error: createErrorResponse('Request body exceeds the 64 KiB limit', 413, undefined, 'PAYLOAD_TOO_LARGE') };
      }
      chunks.push(value);
    }
  } catch {
    return { error: createErrorResponse('Request body could not be read', 400, undefined, 'INVALID_JSON') };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { body: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { error: createErrorResponse('Invalid JSON payload provided in request body', 400, undefined, 'INVALID_JSON') };
  }
}
