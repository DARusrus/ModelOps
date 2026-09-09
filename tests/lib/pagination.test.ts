import { describe, expect, it } from 'vitest';
import { decodeEvaluationCursor, encodeEvaluationCursor, evaluationCursorFilter } from '../../src/lib/modelops/pagination';

const cursor = { createdAt: '2026-09-04T12:30:00.000Z', id: '00000000-0000-4000-8000-000000000001' };

describe('saved evaluation cursor', () => {
  it('round-trips a versioned cursor and canonicalizes its timestamp', () => {
    expect(decodeEvaluationCursor(encodeEvaluationCursor(cursor))).toEqual(cursor);
  });

  it('rejects malformed, oversized, and schema-invalid cursors before query construction', () => {
    expect(() => decodeEvaluationCursor('not-a-cursor')).toThrow('INVALID_CURSOR');
    expect(() => decodeEvaluationCursor('a'.repeat(513))).toThrow('INVALID_CURSOR');
    const malformed = Buffer.from(JSON.stringify({ version: 2, created_at: cursor.createdAt, id: cursor.id })).toString('base64url');
    expect(() => decodeEvaluationCursor(malformed)).toThrow('INVALID_CURSOR');
  });

  it('builds a descending seek predicate from schema-validated values only', () => {
    expect(evaluationCursorFilter(cursor)).toBe('created_at.lt.2026-09-04T12:30:00.000Z,and(created_at.eq.2026-09-04T12:30:00.000Z,id.lt.00000000-0000-4000-8000-000000000001)');
  });
});
