import { requireDefaultActor } from '@/lib/auth/actor';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/modelops/validators';
import { parseReviewAttestation, ReviewHistoryResponseSchema, UuidSchema } from '@/domain/modelops/api-contracts';
import { logger } from '@/lib/logger';
import { withRequestId } from '@/lib/http';

const IdSchema = UuidSchema;

async function get(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = IdSchema.parse((await context.params).id);
    const actor = await requireDefaultActor('read');
    const supabase = await createSupabaseServerClient();
    const { data: card, error: cardError } = await supabase.from('model_cards').select('organization_id, workflow_state, governance_policy_id').eq('id', id).eq('organization_id', actor.organizationId).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (cardError) return createErrorResponse('Saved evaluation could not be loaded', 503);
    if (!card) return createErrorResponse('Saved evaluation was not found', 404);
    const { data: history, error: historyError } = await supabase.from('review_attestations').select('id, action, reason, rubric_version, policy_id, previous_digest, digest, sequence_no, digest_version, created_at').eq('model_card_reference', id).eq('organization_id', actor.organizationId).order('sequence_no', { ascending: true });
    if (historyError) return createErrorResponse('Review history could not be loaded', 503);
    const { data: integrity, error: integrityError } = await supabase.rpc('verify_model_card_attestations', { target_card: id });
    if (integrityError) return createErrorResponse('Review integrity could not be verified', 503);
    return createSuccessResponse(ReviewHistoryResponseSchema, { success: true, workflow_state: card.workflow_state, governance_policy_id: card.governance_policy_id, history: (history ?? []).map(parseReviewAttestation), integrity });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return createErrorResponse('Authentication is required', 401, undefined, 'UNAUTHENTICATED');
    if (error instanceof Error && ['FORBIDDEN', 'ORGANIZATION_SELECTION_REQUIRED'].includes(error.message)) return createErrorResponse('You are not authorized for this organization', 403);
    logger.error('[API /api/modelops/[id]/history] Read failure', error);
    return createErrorResponse('Review history could not be loaded', 500);
  }
}

export const GET = withRequestId(get);
