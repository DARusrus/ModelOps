import { ZodError } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/modelops/validators';
import { ActiveOrganizationResponseSchema, ActiveOrganizationsResponseSchema, OrganizationSelectionRequestSchema } from '@/domain/modelops/api-contracts';
import { readJsonRequest, withRequestId } from '@/lib/http';

const SelectionSchema = OrganizationSelectionRequestSchema;
const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 };

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

async function get(request: Request) {
  try {
    const { memberships } = await authenticatedMemberships();
    return createSuccessResponse(ActiveOrganizationsResponseSchema, { success: true, organizations: memberships });
  } catch (error) {
    return createErrorResponse(error instanceof Error && error.message === 'UNAUTHENTICATED' ? 'Authentication is required' : 'Organizations could not be loaded', error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 503);
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
    response.cookies.set('modelops-active-organization', body.organization_id, cookieOptions);
    return response;
  } catch (error) {
    if (error instanceof ZodError) return createErrorResponse('Organization selection is invalid', 400);
    return createErrorResponse(error instanceof Error && error.message === 'UNAUTHENTICATED' ? 'Authentication is required' : 'Organization could not be selected', error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 503);
  }
}

export const GET = withRequestId(get);
export const POST = withRequestId(post);
