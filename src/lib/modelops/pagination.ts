import { z } from 'zod';

const LegacyCursorSchema = z.object({
  version: z.literal(1),
  created_at: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
}).strict();

const CursorSchema = z.object({
  version: z.literal(2),
  created_at: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
  sort: z.enum(['newest', 'oldest']),
}).strict();

export type EvaluationCursor = {
  createdAt: string;
  id: string;
  sort: 'newest' | 'oldest';
};

/** A deliberately small, opaque API continuation token; it grants no access. */
export function encodeEvaluationCursor(cursor: EvaluationCursor): string {
  return Buffer.from(JSON.stringify({ version: 2, created_at: cursor.createdAt, id: cursor.id, sort: cursor.sort }), 'utf8').toString('base64url');
}

/**
 * Decode only cursors this service issued. The resulting fields are parsed
 * before being interpolated into PostgREST's filter-language string.
 */
export function decodeEvaluationCursor(value: string): EvaluationCursor {
  if (!/^[A-Za-z0-9_-]{1,512}$/.test(value)) throw new Error('INVALID_CURSOR');
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    const parsed = decoded?.version === 1 ? LegacyCursorSchema.parse(decoded) : CursorSchema.parse(decoded);
    return {
      createdAt: new Date(parsed.created_at).toISOString(),
      id: parsed.id,
      sort: parsed.version === 1 ? 'newest' : parsed.sort,
    };
  } catch {
    throw new Error('INVALID_CURSOR');
  }
}

/** Keyset predicate for `(created_at, id)`, with every interpolated value validated above. */
export function evaluationCursorFilter(cursor: EvaluationCursor): string {
  const operator = cursor.sort === 'newest' ? 'lt' : 'gt';
  return `created_at.${operator}.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.${operator}.${cursor.id})`;
}
