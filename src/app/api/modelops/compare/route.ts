import { compare_runs } from '@/lib/modelops/tools';
import { CompareRequestSchema, createErrorResponse, createSuccessResponse } from '@/lib/modelops/validators';
import { ComparisonResponseSchema } from '@/domain/modelops/api-contracts';
import { ZodError } from 'zod';
import { logger } from '@/lib/logger';
import { readJsonRequest, withRequestId } from '@/lib/http';
import { requireDefaultActor } from '@/lib/auth/actor';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { consumeSharedRateLimit } from '@/lib/shared-rate-limit';
import { ModelCardOutputSchema } from '@/domain/modelops/model-card';

async function post(request: Request) {
  try {
    const actor = await requireDefaultActor('compare');
    const supabase = await createSupabaseServerClient();
    if (!await consumeSharedRateLimit(supabase, 'compare', 20, 60)) {
      return createErrorResponse('Too Many Requests. Please try again later.', 429, undefined, 'RATE_LIMITED');
    }

    const parsedRequest = await readJsonRequest(request);
    if ('error' in parsedRequest) return parsedRequest.error;
    const rawBody = parsedRequest.body;

    if (!rawBody || typeof rawBody !== 'object') {
      return createErrorResponse('Invalid JSON payload provided in request body', 400, undefined, 'INVALID_JSON');
    }

    const { baseline_id: baselineId, candidate_id: candidateId } = CompareRequestSchema.parse(rawBody);
    if (baselineId === candidateId) {
      return createErrorResponse('Choose two different saved evaluations to compare.', 400, undefined, 'VALIDATION_FAILED');
    }

    // Tenant scope and expiry are enforced before evaluation payloads are read.
    const { data: records, error: recordsError } = await supabase
      .from('model_cards')
      .select('id, payload')
      .eq('organization_id', actor.organizationId)
      .in('id', [baselineId, candidateId])
      .gt('expires_at', new Date().toISOString());
    if (recordsError) return createErrorResponse('Saved evaluations could not be loaded', 503);
    if (!records || records.length !== 2) return createErrorResponse('One or both saved evaluations were not found', 404);

    const recordsById = new Map(records.map((record) => [record.id, record]));
    const baseline = recordsById.get(baselineId);
    const candidate = recordsById.get(candidateId);
    if (!baseline || !candidate) return createErrorResponse('One or both saved evaluations were not found', 404);
    const run1 = ModelCardOutputSchema.parse(baseline.payload);
    const run2 = ModelCardOutputSchema.parse(candidate.payload);

    const comparisonResult = compare_runs(run1, run2);

    return createSuccessResponse(ComparisonResponseSchema, {
      success: true,
      comparison: comparisonResult,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return createErrorResponse('Authentication is required', 401);
    if (error instanceof Error && error.message === 'RATE_LIMIT_UNAVAILABLE') return createErrorResponse('Request controls are temporarily unavailable', 503);
    if (error instanceof Error && ['FORBIDDEN', 'ORGANIZATION_SELECTION_REQUIRED'].includes(error.message)) return createErrorResponse('You are not authorized for this organization', 403);
    if (error instanceof ZodError) {
      return createErrorResponse(
        'Input validation failed',
        400,
        error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
        'VALIDATION_FAILED'
      );
    }

    logger.error('[API /api/modelops/compare] Server Error:', error);
    return createErrorResponse(
      'An internal server error occurred while comparing experiment runs.',
      500,
      undefined,
      'INTERNAL_ERROR'
    );
  }
}

export const POST = withRequestId(post);
