import { ZodError } from 'zod';
import { ReviewQueueResponseSchema, ReviewQueueRpcRowsSchema } from '@/domain/reviews/contracts';
import { requireDefaultActor } from '@/lib/auth/actor';
import { withRequestId } from '@/lib/http';
import { logger } from '@/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/lib/modelops/validators';
import { decodeEvaluationCursor, encodeEvaluationCursor } from '@/lib/modelops/pagination';
import { parseReviewQueueQuery } from '@/lib/reviews/query';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

async function get(request: Request) {
  try {
    const actor = await requireDefaultActor('review');
    let query;
    try {
      query = parseReviewQueueQuery(new URL(request.url).searchParams);
    } catch (error) {
      if (error instanceof ZodError || (error instanceof Error && error.message === 'INVALID_REVIEW_QUERY')) {
        return createErrorResponse('Review queue query is invalid', 400, undefined, 'VALIDATION_FAILED');
      }
      throw error;
    }
    let cursor;
    try {
      cursor = query.cursor ? decodeEvaluationCursor(query.cursor) : undefined;
      if (cursor?.sort === 'oldest') throw new Error('INVALID_CURSOR');
    } catch {
      return createErrorResponse('Pagination cursor is invalid', 400, undefined, 'INVALID_CURSOR');
    }

    const { data, error } = await createSupabaseAdminClient().rpc('list_review_queue_as', {
      requesting_actor: actor.userId,
      target_organization: actor.organizationId,
      requested_state: query.state === 'all' ? null : query.state,
      requested_limit: query.limit + 1,
      cursor_created_at: cursor?.createdAt ?? null,
      cursor_id: cursor?.id ?? null,
    });
    if (error) {
      logger.warn('[API /api/reviews] Review queue query failed', { code: error.code });
      return createErrorResponse('Review queue could not be loaded', 503);
    }

    const records = ReviewQueueRpcRowsSchema.parse(data ?? []);
    const hasMore = records.length > query.limit;
    const reviews = records.slice(0, query.limit);
    const last = reviews.at(-1);
    return createSuccessResponse(ReviewQueueResponseSchema, {
      success: true,
      reviews,
      page_size: query.limit,
      has_more: hasMore,
      next_cursor: hasMore && last
        ? encodeEvaluationCursor({ createdAt: last.created_at, id: last.id, sort: 'newest' })
        : null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return createErrorResponse('Authentication is required', 401, undefined, 'UNAUTHENTICATED');
    }
    if (error instanceof Error && ['FORBIDDEN', 'ORGANIZATION_SELECTION_REQUIRED'].includes(error.message)) {
      return createErrorResponse('Your organization role does not permit review access', 403, undefined, 'FORBIDDEN');
    }
    if (error instanceof ZodError) {
      logger.error('[API /api/reviews] Review queue contract violation');
      return createErrorResponse('Review queue data could not be validated', 500, undefined, 'INTERNAL_ERROR');
    }
    logger.error('[API /api/reviews] Review queue read failed', { error_type: error instanceof Error ? error.name : 'UNKNOWN' });
    return createErrorResponse('Review queue could not be loaded', 500, undefined, 'INTERNAL_ERROR');
  }
}

export const GET = withRequestId(get);
