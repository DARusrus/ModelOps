import { ReviewQueueQuerySchema, type ReviewQueueQuery } from '@/domain/reviews/contracts';

const queryKeys = ['state', 'limit', 'cursor'] as const;

export function parseReviewQueueQuery(searchParams: URLSearchParams): ReviewQueueQuery {
  const unknownKeys = Array.from(new Set(searchParams.keys())).filter(
    (key) => !queryKeys.includes(key as (typeof queryKeys)[number]),
  );
  if (unknownKeys.length > 0) throw new Error('INVALID_REVIEW_QUERY');

  const input: Record<string, string> = {};
  for (const key of queryKeys) {
    const values = searchParams.getAll(key);
    if (values.length > 1) throw new Error('INVALID_REVIEW_QUERY');
    if (values[0]?.trim()) input[key] = values[0];
  }
  return ReviewQueueQuerySchema.parse(input);
}
