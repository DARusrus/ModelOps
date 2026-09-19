import { requireDefaultActor } from '@/lib/auth/actor';
import { OrganizationMemberListResponseSchema, OrganizationMemberRecordSchema } from '@/domain/organization/contracts';
import { withRequestId } from '@/lib/http';
import { createErrorResponse, createSuccessResponse } from '@/lib/modelops/validators';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

async function get() {
  try {
    const actor = await requireDefaultActor('admin');
    const { data, error } = await createSupabaseAdminClient().rpc('list_organization_members_as', {
      requesting_actor: actor.userId,
      target_organization: actor.organizationId,
    });
    if (error) throw new Error('MEMBERS_UNAVAILABLE');
    return createSuccessResponse(OrganizationMemberListResponseSchema, {
      success: true,
      members: OrganizationMemberRecordSchema.array().parse(data ?? []).map((member) => ({
        ...member,
        is_current_user: member.user_id === actor.userId,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return createErrorResponse('Authentication is required', 401, undefined, 'UNAUTHENTICATED');
    if (error instanceof Error && error.message === 'FORBIDDEN') return createErrorResponse('Only an organization administrator can view members', 403);
    return createErrorResponse('Organization members could not be loaded', 503);
  }
}

export const GET = withRequestId(get);
