import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createErrorResponse, createSuccessResponse } from '@/lib/modelops/validators';
import { PolicyBlockedResponseSchema, ReviewRequestSchema, ReviewResponseSchema, UuidSchema } from '@/domain/modelops/api-contracts';
import { requireDefaultActor } from '@/lib/auth/actor';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { readJsonRequest, withRequestId } from '@/lib/http';
import { logger } from '@/lib/logger';
import { ModelCardOutputSchema } from '@/domain/modelops/model-card';
import { evaluatePolicyCompliance } from '@/lib/modelops/policy';
import { ModelCardOutput } from '@/types/modelops';
import { mayApproveCard, type ReviewMode } from '@/lib/governance/review-mode';
import { abandonIdempotency, claimIdempotency, idempotencyKey, requestFingerprint } from '@/lib/idempotency';

const IdSchema = UuidSchema;

async function post(request: Request, context: { params: Promise<{ id: string }> }) {
  let idempotency: { client: ReturnType<typeof createSupabaseAdminClient>; context: { organizationId: string; actorId: string; operation: string; key: string; fingerprint: string } } | undefined;
  try {
    const id = IdSchema.parse((await context.params).id);
    const parsedRequest = await readJsonRequest(request);
    if ('error' in parsedRequest) return parsedRequest.error;
    let body: ReturnType<typeof ReviewRequestSchema.parse>;
    try {
      body = ReviewRequestSchema.parse(parsedRequest.body);
    } catch (error) {
      if (error instanceof ZodError) return createErrorResponse('Review input is invalid', 400, error.errors.map((item) => ({ path: item.path.join('.'), message: item.message })), 'VALIDATION_FAILED');
      throw error;
    }
    const requiredPermission = body.action === 'submitted' ? 'evaluate' : 'review';
    const actor = await requireDefaultActor(requiredPermission);
    const supabase = createSupabaseAdminClient();
    const { data: card, error: cardError } = await supabase.from('model_cards').select('organization_id, created_by, payload, workflow_state').eq('id', id).eq('organization_id', actor.organizationId).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (cardError) return createErrorResponse('Saved evaluation could not be loaded', 503);
    // Do not reveal the existence of another tenant's record.
    if (!card) return createErrorResponse('Saved evaluation was not found', 404);
    const { data: organization, error: organizationError } = await supabase.from('organizations').select('review_mode').eq('id', actor.organizationId).maybeSingle();
    if (organizationError || !organization) return createErrorResponse('Organization governance settings could not be loaded', 503);
    if (body.action === 'approved' && !mayApproveCard(organization.review_mode as ReviewMode, card.created_by, actor.userId)) return createErrorResponse('Independent review is enabled: the card author cannot approve their own card.', 403, undefined, 'SELF_APPROVAL_FORBIDDEN');
    const persistedCard = ModelCardOutputSchema.parse(card.payload) as ModelCardOutput;
    const policy = evaluatePolicyCompliance(persistedCard, body.policy_id);
    // Approval is a server decision over persisted evidence, never a client-side UI decision.
    if (body.action === 'approved' && !policy.isPassed) {
      return NextResponse.json(PolicyBlockedResponseSchema.parse({ success: false, code: 'POLICY_BLOCKED', error: 'Approval is blocked by the selected governance policy.', policy }), { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }
    const requestContext = { organizationId: actor.organizationId, actorId: actor.userId, operation: `review.${id}`, key: idempotencyKey(request), fingerprint: requestFingerprint(body) };
    const claim = await claimIdempotency(supabase, requestContext);
    if (claim.action === 'replay') return createSuccessResponse(ReviewResponseSchema, claim.response_body, claim.response_status, { 'Idempotency-Replayed': 'true' });
    if (claim.action === 'conflict') return createErrorResponse('This idempotency key was already used for a different request.', 409, undefined, 'IDEMPOTENCY_CONFLICT');
    if (claim.action === 'in_progress') return createErrorResponse('An identical request is already being processed.', 409, undefined, 'OPERATION_IN_PROGRESS');
    idempotency = { client: supabase, context: requestContext };
    const { data, error } = await supabase.rpc('attest_model_card_idempotently', {
      target_org: actor.organizationId,
      requesting_actor: actor.userId,
      target_card: id,
      requested_action: body.action,
      requested_reason: body.reason,
      requested_policy_id: body.policy_id,
      target_operation: requestContext.operation,
      target_key: requestContext.key,
      target_fingerprint: requestContext.fingerprint,
      response_policy: policy,
    });
    if (error) {
      logger.warn('[API /api/modelops/[id]/review] Attestation rejected', { code: error.code, message: error.message });
      if (error.message.includes('SELF_APPROVAL_FORBIDDEN')) throw new Error('REVIEW_SELF_APPROVAL_FORBIDDEN');
      if (error.message.includes('FORBIDDEN')) throw new Error('REVIEW_FORBIDDEN');
      if (error.message.includes('INVALID_TRANSITION')) throw new Error('REVIEW_INVALID_TRANSITION');
      if (error.message.includes('INVALID_REASON')) throw new Error('REVIEW_INVALID_REASON');
      if (error.message.includes('MODEL_CARD_NOT_FOUND')) throw new Error('REVIEW_NOT_FOUND');
      throw new Error('REVIEW_PERSISTENCE_UNAVAILABLE');
    }
    if (!data) throw new Error('REVIEW_RESPONSE_CONTRACT_VIOLATION');
    const responseBody = ReviewResponseSchema.parse(data);
    idempotency = undefined;
    return createSuccessResponse(ReviewResponseSchema, responseBody);
  } catch (error) {
    if (idempotency) await abandonIdempotency(idempotency.client, idempotency.context);
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return createErrorResponse('Authentication is required', 401, undefined, 'UNAUTHENTICATED');
    if (error instanceof Error && error.message === 'IDEMPOTENCY_REQUIRED') return createErrorResponse('An Idempotency-Key UUID header is required for this action.', 400, undefined, 'IDEMPOTENCY_REQUIRED');
    if (error instanceof Error && error.message === 'IDEMPOTENCY_UNAVAILABLE') return createErrorResponse('Retry protection is temporarily unavailable.', 503);
    if (error instanceof Error && error.message === 'REVIEW_SELF_APPROVAL_FORBIDDEN') return createErrorResponse('Independent review is enabled: the card author cannot approve their own card.', 403, undefined, 'SELF_APPROVAL_FORBIDDEN');
    if (error instanceof Error && error.message === 'REVIEW_FORBIDDEN') return createErrorResponse('Your organization role does not permit this review action.', 403);
    if (error instanceof Error && error.message === 'REVIEW_INVALID_TRANSITION') return createErrorResponse('This action is not valid from the card’s current workflow state.', 409);
    if (error instanceof Error && error.message === 'REVIEW_INVALID_REASON') return createErrorResponse('A review reason between 1 and 2,000 characters is required.', 400);
    if (error instanceof Error && error.message === 'REVIEW_NOT_FOUND') return createErrorResponse('Saved evaluation was not found', 404);
    if (error instanceof Error && ['FORBIDDEN', 'ORGANIZATION_SELECTION_REQUIRED'].includes(error.message)) return createErrorResponse('You are not authorized for this organization', 403);
    logger.error('[API /api/modelops/[id]/review] Review failure', error);
    return createErrorResponse('Review record could not be saved', 500);
  }
}

export const POST = withRequestId(post);
