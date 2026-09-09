import { z } from 'zod';

const CursorSchema = z.object({
  version: z.literal(1),
  created_at: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
}).strict();

export type EvaluationCursor = {
  createdAt: string;
  id: string;
};

/** A deliberately small, opaque API continuation token; it grants no access. */
export function encodeEvaluationCursor(cursor: EvaluationCursor): string {
  return Buffer.from(JSON.stringify({ version: 1, created_at: cursor.createdAt, id: cursor.id }), 'utf8').toString('base64url');
}

/**
 * Decode only cursors this service issued. The resulting fields are parsed
 * before being interpolated into PostgREST's filter-language string.
 */
export function decodeEvaluationCursor(value: string): EvaluationCursor {
  if (!/^[A-Za-z0-9_-]{1,512}$/.test(value)) throw new Error('INVALID_CURSOR');
  try {
    const parsed = CursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    return { createdAt: new Date(parsed.created_at).toISOString(), id: parsed.id };
  } catch {
    throw new Error('INVALID_CURSOR');
  }
}

/** Descending keyset predicate for `(created_at, id)`, both validated above. */
export function evaluationCursorFilter(cursor: EvaluationCursor): string {
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}
