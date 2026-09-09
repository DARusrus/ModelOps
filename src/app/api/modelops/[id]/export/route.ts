import { NextResponse } from 'next/server';
import { requireDefaultActor } from '@/lib/auth/actor';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createErrorResponse } from '@/lib/modelops/validators';
import { GovernanceExportSchema, parseReviewAttestation, UuidSchema } from '@/domain/modelops/api-contracts';
import { logger } from '@/lib/logger';
import { withRequestId } from '@/lib/http';

const IdSchema = UuidSchema;

async function get(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = IdSchema.parse((await context.params).id);
    const actor = await requireDefaultActor('read');
    const supabase = await createSupabaseServerClient();
    const { data: card, error: cardError } = await supabase.from('model_cards').select('id, organization_id, payload, readiness_score, rubric_version, workflow_state, governance_policy_id, created_at, expires_at').eq('id', id).eq('organization_id', actor.organizationId).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (cardError) return createErrorResponse('Saved evaluation could not be loaded', 503);
    if (!card) return createErrorResponse('Saved evaluation was not found', 404);
    const { data: history, error: historyError } = await supabase.from('review_attestations').select('id, action, reason, rubric_version, policy_id, previous_digest, digest, sequence_no, digest_version, created_at').eq('model_card_reference', id).eq('organization_id', actor.organizationId).order('sequence_no', { ascending: true });
    if (historyError) return createErrorResponse('Review history could not be loaded', 503);
    const dossier = GovernanceExportSchema.parse({ schema_version: 'modelops-governance-export/1', exported_at: new Date().toISOString(), model_card: card, review_history: (history ?? []).map(parseReviewAttestation) });
    return new NextResponse(JSON.stringify(dossier, null, 2), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="model-card-${id}.json"`, 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return createErrorResponse('Authentication is required', 401);
    if (error instanceof Error && ['FORBIDDEN', 'ORGANIZATION_SELECTION_REQUIRED'].includes(error.message)) return createErrorResponse('You are not authorized for this organization', 403);
    logger.error('[API /api/modelops/[id]/export] Export failure', error);
    return createErrorResponse('Governance export could not be generated', 500);
  }
}

export const GET = withRequestId(get);
