import { ZodError } from 'zod';
import { requireDefaultActor } from '@/lib/auth/actor';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createErrorResponse, createSuccessResponse } from '@/lib/modelops/validators';
import { GovernanceResponseSchema, GovernanceUpdateRequestSchema, GovernanceUpdateResponseSchema } from '@/domain/modelops/api-contracts';
import { readJsonRequest, withRequestId } from '@/lib/http';

const GovernanceSchema = GovernanceUpdateRequestSchema;

async function get() {
  try {
    const actor = await requireDefaultActor('read');
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('organizations').select('review_mode').eq('id', actor.organizationId).single();
    if (error || !data) return createErrorResponse('Organization governance settings could not be loaded', 503);
    return createSuccessResponse(GovernanceResponseSchema, { success: true, review_mode: data.review_mode, can_manage: actor.role === 'admin' });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return createErrorResponse('Authentication is required', 401, undefined, 'UNAUTHENTICATED');
    return createErrorResponse('Organization governance settings could not be loaded', 403);
  }
}

async function patch(request: Request) {
  try {
    const actor = await requireDefaultActor('admin');
    const parsedRequest = await readJsonRequest(request);
    if ('error' in parsedRequest) return parsedRequest.error;
    const body = GovernanceSchema.parse(parsedRequest.body);
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('organizations').update({ review_mode: body.review_mode }).eq('id', actor.organizationId);
    if (error) return createErrorResponse('Organization governance settings could not be saved', 503);
    return createSuccessResponse(GovernanceUpdateResponseSchema, { success: true, review_mode: body.review_mode });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return createErrorResponse('Authentication is required', 401, undefined, 'UNAUTHENTICATED');
    if (error instanceof Error && error.message === 'FORBIDDEN') return createErrorResponse('Only an organization administrator can change this setting.', 403);
    if (error instanceof ZodError) return createErrorResponse('Governance setting is invalid', 400);
    return createErrorResponse('Organization governance settings could not be saved', 500);
  }
}

export const GET = withRequestId(get);
export const PATCH = withRequestId(patch);
