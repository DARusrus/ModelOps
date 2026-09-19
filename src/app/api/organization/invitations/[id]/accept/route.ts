import { ACTIVE_ORGANIZATION_COOKIE, activeOrganizationCookieOptions } from '@/lib/auth/active-organization';
import { InvitationAcceptanceResponseSchema, InvitationAcceptanceRpcSchema, InvitationIdSchema } from '@/domain/organization/contracts';
import { withRequestId } from '@/lib/http';
import { createErrorResponse, createSuccessResponse } from '@/lib/modelops/validators';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

async function post(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsedId = InvitationIdSchema.safeParse(id);
  if (!parsedId.success) return createErrorResponse('Invitation identifier is invalid', 400, undefined, 'VALIDATION_FAILED');

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return createErrorResponse('Authentication is required', 401, undefined, 'UNAUTHENTICATED');
    const { data, error } = await supabase.rpc('accept_organization_invitation', { target_invitation: parsedId.data }).single();
    if (error || !data) {
      if (error?.message === 'INVITATION_NOT_FOUND') return createErrorResponse('Invitation was not found', 404);
      if (error?.message === 'INVITATION_EMAIL_MISMATCH') return createErrorResponse('This invitation belongs to a different account', 403);
      if (error?.message === 'INVITATION_EXPIRED') return createErrorResponse('This invitation has expired. Ask an administrator to resend it.', 410);
      if (error?.message === 'INVITATION_NOT_PENDING') return createErrorResponse('This invitation is no longer available', 409);
      throw new Error('INVITATION_ACCEPT_FAILED');
    }
    const parsedAcceptance = InvitationAcceptanceRpcSchema.safeParse(data);
    if (!parsedAcceptance.success) throw new Error('INVITATION_RESPONSE_INVALID');
    const accepted = parsedAcceptance.data;
    const response = createSuccessResponse(InvitationAcceptanceResponseSchema, {
      success: true,
      organization_id: accepted.organization_id,
      organization_name: accepted.organization_name,
      role: accepted.organization_role,
      accepted: accepted.accepted,
    });
    response.cookies.set(ACTIVE_ORGANIZATION_COOKIE, accepted.organization_id, activeOrganizationCookieOptions);
    return response;
  } catch {
    return createErrorResponse('Organization invitation could not be accepted', 503);
  }
}

export const POST = withRequestId(post);
