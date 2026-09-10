import { ZodError } from 'zod';
import { createErrorResponse, createSuccessResponse } from '@/lib/modelops/validators';
import { EvaluationDetailResponseSchema, UuidSchema } from '@/domain/modelops/api-contracts';
import { requireDefaultActor } from '@/lib/auth/actor';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseStoredEvaluations } from '@/lib/modelops/stored-evaluation';
import { logger } from '@/lib/logger';
import { withRequestId } from '@/lib/http';

const IdSchema = UuidSchema;

async function get(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = IdSchema.parse((await context.params).id);
    const actor = await requireDefaultActor('read');
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('model_cards').select('id, payload, created_at, expires_at, workflow_state').eq('id', id).eq('organization_id', actor.organizationId).gt('expires_at', new Date().toISOString()).limit(1);
    if (error) return createErrorResponse('Saved evaluation could not be loaded', 503);
    if (!data || data.length === 0) return createErrorResponse('Saved evaluation was not found', 404);
    const evaluation = parseStoredEvaluations(data)[0];
    return createSuccessResponse(EvaluationDetailResponseSchema, { success: true, evaluation: { id: evaluation.id, ...evaluation.payload, workflow_state: data[0].workflow_state, created_at: evaluation.created_at, expires_at: evaluation.expires_at } });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return createErrorResponse('Authentication is required', 401, undefined, 'UNAUTHENTICATED');
    if (error instanceof Error && ['FORBIDDEN', 'ORGANIZATION_SELECTION_REQUIRED'].includes(error.message)) return createErrorResponse('You are not authorized for this organization', 403);
    if (error instanceof ZodError) return createErrorResponse('Saved evaluation ID is invalid', 400, undefined, 'VALIDATION_FAILED');
    logger.error('[API /api/modelops/[id]] Read failure', error);
    return createErrorResponse('Saved evaluation could not be loaded', 500, undefined, 'INTERNAL_ERROR');
  }
}

export const GET = withRequestId(get);
