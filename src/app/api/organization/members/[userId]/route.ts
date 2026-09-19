import { z } from 'zod';
import { requireDefaultActor } from '@/lib/auth/actor';
import { OrganizationMemberMutationResponseSchema, UpdateMemberRoleRequestSchema } from '@/domain/organization/contracts';
import { readJsonRequest, withRequestId } from '@/lib/http';
import { createErrorResponse, createSuccessResponse } from '@/lib/modelops/validators';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ userId: string }> };
const UserIdSchema = z.string().uuid();

function memberMutationError(message: string | undefined) {
  if (message === 'MEMBER_NOT_FOUND') return createErrorResponse('Organization member was not found', 404);
  if (message === 'FINAL_ADMIN_REQUIRED') return createErrorResponse('The final organization administrator cannot be demoted or removed', 409);
  if (message === 'FORBIDDEN') return createErrorResponse('Only an organization administrator can manage members', 403);
  return undefined;
}

async function patch(request: Request, context: RouteContext) {
  try {
    const actor = await requireDefaultActor('admin');
    const { userId } = await context.params;
    const targetUser = UserIdSchema.parse(userId);
    const parsedRequest = await readJsonRequest(request);
    if ('error' in parsedRequest) return parsedRequest.error;
    const body = UpdateMemberRoleRequestSchema.parse(parsedRequest.body);
    const { data, error } = await createSupabaseAdminClient().rpc('change_organization_member_role_as', {
      requesting_actor: actor.userId,
      target_organization: actor.organizationId,
      target_user: targetUser,
      requested_role: body.role,
    });
    if (error || !data) return memberMutationError(error?.message) ?? createErrorResponse('Member role could not be changed', 503);
    return createSuccessResponse(OrganizationMemberMutationResponseSchema, { success: true, user_id: targetUser, role: body.role });
  } catch (error) {
    if (error instanceof z.ZodError) return createErrorResponse('Member role request is invalid', 400, undefined, 'VALIDATION_FAILED');
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return createErrorResponse('Authentication is required', 401, undefined, 'UNAUTHENTICATED');
    if (error instanceof Error && error.message === 'FORBIDDEN') return createErrorResponse('Only an organization administrator can manage members', 403);
    return createErrorResponse('Member role could not be changed', 503);
  }
}

async function remove(_request: Request, context: RouteContext) {
  try {
    const actor = await requireDefaultActor('admin');
    const { userId } = await context.params;
    const targetUser = UserIdSchema.parse(userId);
    const { data, error } = await createSupabaseAdminClient().rpc('remove_organization_member_as', {
      requesting_actor: actor.userId,
      target_organization: actor.organizationId,
      target_user: targetUser,
    });
    if (error || !data) return memberMutationError(error?.message) ?? createErrorResponse('Organization member could not be removed', 503);
    return createSuccessResponse(OrganizationMemberMutationResponseSchema, { success: true, user_id: targetUser });
  } catch (error) {
    if (error instanceof z.ZodError) return createErrorResponse('Member identifier is invalid', 400, undefined, 'VALIDATION_FAILED');
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return createErrorResponse('Authentication is required', 401, undefined, 'UNAUTHENTICATED');
    if (error instanceof Error && error.message === 'FORBIDDEN') return createErrorResponse('Only an organization administrator can manage members', 403);
    return createErrorResponse('Organization member could not be removed', 503);
  }
}

export const PATCH = withRequestId(patch);
export const DELETE = withRequestId(remove);
