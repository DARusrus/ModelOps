import { z } from 'zod';
import { requireDefaultActor } from '@/lib/auth/actor';
import { deliverOrganizationInvitation, invitationLinks } from '@/lib/auth/invitation-delivery';
import {
  CreateInvitationRequestSchema,
  InvitationListResponseSchema,
  InvitationMutationResponseSchema,
  InvitationRecordSchema,
  InvitationRpcRowSchema,
} from '@/domain/organization/contracts';
import { readJsonRequest, withRequestId } from '@/lib/http';
import { createErrorResponse, createSuccessResponse } from '@/lib/modelops/validators';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type InvitationRecord = z.infer<typeof InvitationRecordSchema>;

function presentInvitation(row: InvitationRecord, requestUrl: string) {
  const expired = row.status === 'pending' && new Date(row.expires_at).getTime() <= Date.now();
  return {
    ...row,
    status: expired ? 'expired' as const : row.status,
    acceptance_url: invitationLinks(requestUrl, row.id).acceptanceUrl,
  };
}

async function get(request: Request) {
  try {
    const actor = await requireDefaultActor('admin');
    const { data, error } = await createSupabaseAdminClient()
      .from('organization_invitations')
      .select('id, email, role, status, expires_at, created_at')
      .eq('organization_id', actor.organizationId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error('INVITATIONS_UNAVAILABLE');
    return createSuccessResponse(InvitationListResponseSchema, {
      success: true,
      invitations: z.array(InvitationRecordSchema).parse(data ?? []).map((row) => presentInvitation(row, request.url)),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return createErrorResponse('Authentication is required', 401, undefined, 'UNAUTHENTICATED');
    if (error instanceof Error && error.message === 'FORBIDDEN') return createErrorResponse('Only an organization administrator can view invitations', 403);
    return createErrorResponse('Organization invitations could not be loaded', 503);
  }
}

async function post(request: Request) {
  try {
    const actor = await requireDefaultActor('admin');
    const parsedRequest = await readJsonRequest(request);
    if ('error' in parsedRequest) return parsedRequest.error;
    const parsedBody = CreateInvitationRequestSchema.safeParse(parsedRequest.body);
    if (!parsedBody.success) {
      return createErrorResponse(
        'Invitation details are invalid',
        400,
        parsedBody.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
        'VALIDATION_FAILED',
      );
    }
    const body = parsedBody.data;
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc('create_organization_invitation_as', {
      requesting_actor: actor.userId,
      target_organization: actor.organizationId,
      target_email: body.email,
      requested_role: body.role,
    }).single();
    if (error || !data) {
      if (error?.message === 'ALREADY_MEMBER') return createErrorResponse('This account is already an organization member', 409);
      if (error?.message === 'FORBIDDEN') return createErrorResponse('Only an organization administrator can create invitations', 403);
      throw new Error('INVITATION_CREATE_FAILED');
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
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return createErrorResponse('Authentication is required', 401, undefined, 'UNAUTHENTICATED');
    if (error instanceof Error && error.message === 'FORBIDDEN') return createErrorResponse('Only an organization administrator can create invitations', 403);
    return createErrorResponse('Organization invitation could not be created', 503);
  }
}

export const GET = withRequestId(get);
export const POST = withRequestId(post);
