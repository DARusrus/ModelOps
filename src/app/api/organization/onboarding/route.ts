import { ZodError } from 'zod';
import { CreateWorkspaceRequestSchema, CreateWorkspaceResponseSchema, CreateWorkspaceRpcRowSchema } from '@/domain/organization/contracts';
import { ACTIVE_ORGANIZATION_COOKIE, activeOrganizationCookieOptions } from '@/lib/auth/active-organization';
import { readJsonRequest, withRequestId } from '@/lib/http';
import { createErrorResponse, createSuccessResponse } from '@/lib/modelops/validators';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function post(request: Request) {
  try {
    const parsedRequest = await readJsonRequest(request);
    if ('error' in parsedRequest) return parsedRequest.error;
    const body = CreateWorkspaceRequestSchema.parse(parsedRequest.body);
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return createErrorResponse('Authentication is required', 401, undefined, 'UNAUTHENTICATED');

    const { data, error } = await supabase.rpc('create_initial_workspace', { workspace_name: body.workspace_name }).single();
    if (error || !data) {
      if (error?.message === 'WORKSPACE_NAME_INVALID') return createErrorResponse('Workspace name is invalid', 400, undefined, 'VALIDATION_FAILED');
      if (error?.message === 'EMAIL_CONFIRMATION_REQUIRED') return createErrorResponse('Confirm your email before creating a workspace', 403);
      throw new Error('WORKSPACE_CREATE_FAILED');
    }

    const workspace = CreateWorkspaceRpcRowSchema.parse(data);
    const response = createSuccessResponse(CreateWorkspaceResponseSchema, {
      success: true,
      organization_id: workspace.organization_id,
      name: workspace.organization_name,
      role: workspace.organization_role,
      created: workspace.created,
    }, workspace.created ? 201 : 200);
    response.cookies.set(ACTIVE_ORGANIZATION_COOKIE, workspace.organization_id, activeOrganizationCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return createErrorResponse('Workspace details are invalid', 400, error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })), 'VALIDATION_FAILED');
    }
    return createErrorResponse('Workspace could not be created', 503);
  }
}

export const POST = withRequestId(post);
