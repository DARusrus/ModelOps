import { ZodError } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/modelops/validators';
import { ActiveOrganizationResponseSchema, ActiveOrganizationsResponseSchema, OrganizationSelectionRequestSchema } from '@/domain/modelops/api-contracts';
import { readJsonRequest, withRequestId } from '@/lib/http';
import { ACTIVE_ORGANIZATION_COOKIE, activeOrganizationCookieOptions } from '@/lib/auth/active-organization';

const SelectionSchema = OrganizationSelectionRequestSchema;

async function authenticatedMemberships() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  const { data: memberships, error } = await supabase.from('memberships').select('organization_id, role').eq('user_id', user.id).order('created_at');
  if (error) throw new Error('MEMBERSHIPS_UNAVAILABLE');
  const ids = (memberships ?? []).map((membership) => membership.organization_id);
  const { data: organizations, error: organizationsError } = ids.length ? await supabase.from('organizations').select('id, name').in('id', ids) : { data: [], error: null };
  if (organizationsError) throw new Error('MEMBERSHIPS_UNAVAILABLE');
  const names = new Map((organizations ?? []).map((organization) => [organization.id, organization.name]));
  return { supabase, user, memberships: (memberships ?? []).map((membership) => ({ ...membership, name: names.get(membership.organization_id) ?? 'Organization' })) };
}

async function get() {
  try {
    const { memberships } = await authenticatedMemberships();
    return createSuccessResponse(ActiveOrganizationsResponseSchema, { success: true, organizations: memberships });
  } catch (error) {
    const unauthenticated = error instanceof Error && error.message === 'UNAUTHENTICATED';
    return createErrorResponse(unauthenticated ? 'Authentication is required' : 'Organizations could not be loaded', unauthenticated ? 401 : 503, undefined, unauthenticated ? 'UNAUTHENTICATED' : 'INTERNAL_ERROR');
  }
}

async function post(request: Request) {
  try {
    const parsedRequest = await readJsonRequest(request);
    if ('error' in parsedRequest) return parsedRequest.error;
    const body = SelectionSchema.parse(parsedRequest.body);
    const { memberships } = await authenticatedMemberships();
    if (!memberships.some((membership) => membership.organization_id === body.organization_id)) return createErrorResponse('You are not a member of this organization', 403);
    const response = createSuccessResponse(ActiveOrganizationResponseSchema, { success: true, organization_id: body.organization_id });
    response.cookies.set(ACTIVE_ORGANIZATION_COOKIE, body.organization_id, activeOrganizationCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof ZodError) return createErrorResponse('Organization selection is invalid', 400);
    const unauthenticated = error instanceof Error && error.message === 'UNAUTHENTICATED';
    return createErrorResponse(unauthenticated ? 'Authentication is required' : 'Organization could not be selected', unauthenticated ? 401 : 503, undefined, unauthenticated ? 'UNAUTHENTICATED' : 'INTERNAL_ERROR');
  }
}

export const GET = withRequestId(get);
export const POST = withRequestId(post);
