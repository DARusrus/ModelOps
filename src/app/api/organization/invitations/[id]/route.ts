import { requireDefaultActor } from '@/lib/auth/actor';
import { deliverOrganizationInvitation, invitationLinks } from '@/lib/auth/invitation-delivery';
import {
  InvitationActionRequestSchema,
  InvitationIdSchema,
  InvitationMutationResponseSchema,
  InvitationRevocationResponseSchema,
  InvitationRpcRowSchema,
} from '@/domain/organization/contracts';
import { readJsonRequest, withRequestId } from '@/lib/http';
import { createErrorResponse, createSuccessResponse } from '@/lib/modelops/validators';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ id: string }> };
async function patch(request: Request, context: RouteContext) {
  try {
    const actor = await requireDefaultActor('admin');
    const { id } = await context.params;
    const parsedId = InvitationIdSchema.safeParse(id);
    if (!parsedId.success) return createErrorResponse('Invitation identifier is invalid', 400, undefined, 'VALIDATION_FAILED');
    const parsedRequest = await readJsonRequest(request);
    if ('error' in parsedRequest) return parsedRequest.error;
    const parsedBody = InvitationActionRequestSchema.safeParse(parsedRequest.body);
    if (!parsedBody.success) return createErrorResponse('Invitation action is invalid', 400, undefined, 'VALIDATION_FAILED');
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc('renew_organization_invitation_as', {
      requesting_actor: actor.userId,
      target_invitation: parsedId.data,
    }).single();
    if (error || !data) {
      if (error?.message === 'INVITATION_NOT_FOUND') return createErrorResponse('Invitation was not found', 404);
      if (error?.message === 'INVITATION_NOT_PENDING') return createErrorResponse('Only pending invitations can be resent', 409);
      throw new Error('INVITATION_RENEW_FAILED');
    }
    const parsedInvitation = InvitationRpcRowSchema.safeParse(data);
    if (!parsedInvitation.success) throw new Error('INVITATION_RESPONSE_INVALID');
    const invitation = parsedInvitation.data;
    const links = invitationLinks(request.url, invitation.invitation_id);
    const delivery = await deliverOrganizationInvitation(invitation.invitation_email, links.callbackUrl, invitation.recipient_exists);
    return createSuccessResponse(InvitationMutationResponseSchema, {
      success: true,
      invitation: {
        id: invitation.invitation_id,
        email: invitation.invitation_email,
        role: invitation.invitation_role,
        status: 'pending',
        expires_at: invitation.invitation_expires_at,
        created_at: invitation.invitation_created_at,
        acceptance_url: links.acceptanceUrl,
      },
      delivery,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return createErrorResponse('Authentication is required', 401, undefined, 'UNAUTHENTICATED');
    if (error instanceof Error && error.message === 'FORBIDDEN') return createErrorResponse('Only an organization administrator can resend invitations', 403);
    return createErrorResponse('Organization invitation could not be resent', 503);
  }
}

async function remove(request: Request, context: RouteContext) {
  try {
    const actor = await requireDefaultActor('admin');
    const { id } = await context.params;
    const parsedId = InvitationIdSchema.safeParse(id);
    if (!parsedId.success) return createErrorResponse('Invitation identifier is invalid', 400, undefined, 'VALIDATION_FAILED');
    const { data, error } = await createSupabaseAdminClient().rpc('revoke_organization_invitation_as', {
      requesting_actor: actor.userId,
      target_invitation: parsedId.data,
    });
    if (error || !data) {
      if (error?.message === 'INVITATION_NOT_FOUND') return createErrorResponse('Invitation was not found', 404);
      if (error?.message === 'INVITATION_NOT_PENDING') return createErrorResponse('Only pending invitations can be revoked', 409);
      throw new Error('INVITATION_REVOKE_FAILED');
    }
    return createSuccessResponse(InvitationRevocationResponseSchema, { success: true, invitation_id: parsedId.data });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return createErrorResponse('Authentication is required', 401, undefined, 'UNAUTHENTICATED');
    if (error instanceof Error && error.message === 'FORBIDDEN') return createErrorResponse('Only an organization administrator can revoke invitations', 403);
    return createErrorResponse('Organization invitation could not be revoked', 503);
  }
}

export const PATCH = withRequestId(patch);
export const DELETE = withRequestId(remove);
