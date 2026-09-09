import { validateInput, createErrorResponse, createSuccessResponse } from '@/lib/modelops/validators';
import { EvaluationCreateResponseSchema, EvaluationListResponseSchema } from '@/domain/modelops/api-contracts';
import { isPublicNonSensitiveEvaluation, processModelOpsRequest } from '@/lib/modelops/service';
import { ZodError } from 'zod';
import { logger } from '@/lib/logger';
import { PreferredProvider } from '@/types/modelops';
import { readJsonRequest, withRequestId } from '@/lib/http';
import { requireDefaultActor } from '@/lib/auth/actor';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { parseStoredEvaluationSummaries } from '@/lib/modelops/stored-evaluation';
import { decodeEvaluationCursor, encodeEvaluationCursor, evaluationCursorFilter } from '@/lib/modelops/pagination';
import { consumeSharedRateLimit } from '@/lib/shared-rate-limit';
import { env } from '@/lib/env';
import { abandonIdempotency, claimIdempotency, completeIdempotency, idempotencyKey, requestFingerprint } from '@/lib/idempotency';

async function post(request: Request) {
  let idempotency: { client: ReturnType<typeof createSupabaseAdminClient>; context: { organizationId: string; actorId: string; operation: string; key: string; fingerprint: string } } | undefined;
  let quotaReserved = false;
  try {
    const actor = await requireDefaultActor('evaluate');
    const parsedRequest = await readJsonRequest(request);
    if ('error' in parsedRequest) return parsedRequest.error;
    const rawBody = parsedRequest.body;

    // 1. Zod input validation
    const validatedInput = validateInput(rawBody);

    const persistenceClient = createSupabaseAdminClient();
    const context = { organizationId: actor.organizationId, actorId: actor.userId, operation: 'evaluation.create', key: idempotencyKey(request), fingerprint: requestFingerprint(validatedInput) };
    const claim = await claimIdempotency(persistenceClient, context);
    if (claim.action === 'replay') return createSuccessResponse(EvaluationCreateResponseSchema, claim.response_body, claim.response_status, { 'Idempotency-Replayed': 'true' });
    if (claim.action === 'conflict') return createErrorResponse('This idempotency key was already used for a different request.', 409, undefined, 'IDEMPOTENCY_CONFLICT');
    if (claim.action === 'in_progress') return createErrorResponse('An identical request is already being processed.', 409, undefined, 'OPERATION_IN_PROGRESS');
    idempotency = { client: persistenceClient, context };
    const sessionClient = await createSupabaseServerClient();
    if (!await consumeSharedRateLimit(sessionClient, 'evaluate', 10, 60)) {
      await abandonIdempotency(persistenceClient, context);
      idempotency = undefined;
      return createErrorResponse('Too Many Requests. Please try again later.', 429, undefined, 'RATE_LIMITED');
    }
    // Reserve before an external call to keep the limit race-safe. A fallback
    // result releases this reservation below, so deterministic work is free.
    if (env.AI_EGRESS_MODE === 'non_sensitive_only' && isPublicNonSensitiveEvaluation(validatedInput) && (env.GROQ_API_KEY || env.GEMINI_API_KEY)) {
      const { data: quotaAvailable, error: quotaError } = await persistenceClient.rpc('consume_ai_quota', { target_org: actor.organizationId, daily_limit: 100, monthly_limit: 2000 });
      if (quotaError) throw new Error('AI_QUOTA_UNAVAILABLE');
      if (!quotaAvailable) throw new Error('AI_QUOTA_EXHAUSTED');
      quotaReserved = true;
    }
    // Provider selection and credentials are server policy, never request headers.
    const result = await processModelOpsRequest(validatedInput, { preferredProvider: 'auto' as PreferredProvider });
    if (quotaReserved && result.ai_suggestions?.status !== 'ai_suggestion_available') {
      const { error: quotaReleaseError } = await persistenceClient.rpc('release_ai_quota', { target_org: actor.organizationId });
      if (quotaReleaseError) throw new Error('AI_QUOTA_UNAVAILABLE');
      quotaReserved = false;
    }

    const { data: persisted, error: persistenceError } = await persistenceClient.from('model_cards').insert({
      organization_id: actor.organizationId,
      created_by: actor.userId,
      payload: result,
      readiness_score: result.readiness_score,
      rubric_version: result.rubric_version || 'legacy',
      workflow_state: 'draft',
    }).select('id').single();
    if (persistenceError) {
      logger.error('[API /api/modelops] Persistence failure', persistenceError);
      throw new Error('PERSISTENCE_UNAVAILABLE');
    }
    const responseBody = { ...result, record_id: persisted.id };
    await completeIdempotency(persistenceClient, context, 200, responseBody);
    idempotency = undefined;
    return createSuccessResponse(EvaluationCreateResponseSchema, responseBody);
  } catch (error: unknown) {
    if (idempotency) await abandonIdempotency(idempotency.client, idempotency.context);
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return createErrorResponse('Authentication is required', 401);
    if (error instanceof Error && error.message === 'IDEMPOTENCY_REQUIRED') return createErrorResponse('An Idempotency-Key UUID header is required for this action.', 400, undefined, 'IDEMPOTENCY_REQUIRED');
    if (error instanceof Error && error.message === 'IDEMPOTENCY_UNAVAILABLE') return createErrorResponse('Retry protection is temporarily unavailable.', 503);
    if (error instanceof Error && error.message === 'RATE_LIMIT_UNAVAILABLE') return createErrorResponse('Request controls are temporarily unavailable', 503);
    if (error instanceof Error && error.message === 'AI_QUOTA_UNAVAILABLE') return createErrorResponse('AI quota controls are temporarily unavailable.', 503);
    if (error instanceof Error && error.message === 'AI_QUOTA_EXHAUSTED') return createErrorResponse('The organization AI suggestion quota has been reached.', 429, undefined, 'RATE_LIMITED');
    if (error instanceof Error && error.message === 'PERSISTENCE_UNAVAILABLE') return createErrorResponse('Evaluation could not be saved', 503);
    if (error instanceof Error && ['FORBIDDEN', 'ORGANIZATION_SELECTION_REQUIRED'].includes(error.message)) return createErrorResponse('You are not authorized for this organization', 403);
    if (error instanceof ZodError) {
      return createErrorResponse(
        'Input validation failed',
        400,
        error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
        'VALIDATION_FAILED'
      );
    }

    logger.error('[API /api/modelops] Server Error:', error);
    return createErrorResponse('Internal Server Error', 500, undefined, 'INTERNAL_ERROR');
  }
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

async function get(request: Request) {
  try {
    const actor = await requireDefaultActor('read');
    const supabase = await createSupabaseServerClient();
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get('limit') || DEFAULT_PAGE_SIZE);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
    const cursorValue = url.searchParams.get('cursor');
    let cursor;
    try {
      cursor = cursorValue ? decodeEvaluationCursor(cursorValue) : undefined;
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_CURSOR') return createErrorResponse('Pagination cursor is invalid', 400, undefined, 'INVALID_CURSOR');
      throw error;
    }

    let query = supabase.from('model_cards')
      .select('id, model_name, model_version, readiness_score, created_at, expires_at')
      .eq('organization_id', actor.organizationId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    if (cursor) query = query.or(evaluationCursorFilter(cursor));
    const { data, error } = await query.limit(limit + 1);
    if (error) return createErrorResponse('Saved evaluations could not be loaded', 503);
    try {
      const records = parseStoredEvaluationSummaries(data);
      const hasMore = records.length > limit;
      const page = records.slice(0, limit);
      const evaluations = page.map((item) => ({
        id: item.id,
        model_name: item.model_name,
        version: item.model_version,
        readiness_score: item.readiness_score,
        created_at: item.created_at,
        expires_at: item.expires_at,
      }));
      const last = page.at(-1);
      return createSuccessResponse(EvaluationListResponseSchema, {
        success: true,
        evaluations,
        page_size: limit,
        has_more: hasMore,
        next_cursor: hasMore && last ? encodeEvaluationCursor({ createdAt: last.created_at, id: last.id }) : null,
      });
    } catch {
      logger.error('[API /api/modelops] Stored evaluation contract violation');
      return createErrorResponse('Saved evaluation data could not be validated', 500, undefined, 'INTERNAL_ERROR');
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return createErrorResponse('Authentication is required', 401);
    if (error instanceof Error && ['FORBIDDEN', 'ORGANIZATION_SELECTION_REQUIRED'].includes(error.message)) return createErrorResponse('You are not authorized for this organization', 403);
    logger.error('[API /api/modelops] Read authorization failure', error);
    return createErrorResponse('Saved evaluations could not be loaded', 500, undefined, 'INTERNAL_ERROR');
  }
}

export const POST = withRequestId(post);
export const GET = withRequestId(get);
