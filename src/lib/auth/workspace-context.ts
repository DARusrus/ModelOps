import 'server-only';
import { cookies } from 'next/headers';
import { ACTIVE_ORGANIZATION_COOKIE } from '@/lib/auth/active-organization';
import { canPerform, type Role } from '@/lib/auth/permissions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getVerifiedUser } from '@/lib/supabase/verified-user';

export interface WorkspaceOrganization {
  id: string;
  name: string;
  role: Role;
}

export interface WorkspaceContext {
  accountEmail: string;
  activeOrganization: WorkspaceOrganization;
  organizations: WorkspaceOrganization[];
}

/**
 * Resolves the presentation context for protected pages at the route-group
 * boundary. API routes continue to authorize each operation independently.
 */
export async function requireWorkspaceContext(permission = 'read'): Promise<WorkspaceContext> {
  const supabase = await createSupabaseServerClient();
  const user = await getVerifiedUser(supabase);
  if (!user) throw new Error('UNAUTHENTICATED');

  const { data: memberships, error: membershipsError } = await supabase
    .from('memberships')
    .select('organization_id, role, created_at')
    .eq('user_id', user.id)
    .order('created_at');
  if (membershipsError) throw new Error('WORKSPACE_UNAVAILABLE');

  const typedMemberships = (memberships ?? []).map((membership) => ({
    organizationId: membership.organization_id,
    role: membership.role as Role,
  }));
  if (typedMemberships.length === 0) throw new Error('ORGANIZATION_SELECTION_REQUIRED');

  const requestedOrganizationId = (await cookies()).get(ACTIVE_ORGANIZATION_COOKIE)?.value;
  const activeMembership = requestedOrganizationId
    ? typedMemberships.find((membership) => membership.organizationId === requestedOrganizationId)
    : typedMemberships.length === 1 ? typedMemberships[0] : undefined;
  if (!activeMembership) throw new Error('ORGANIZATION_SELECTION_REQUIRED');
  if (!canPerform(activeMembership.role, permission)) throw new Error('FORBIDDEN');

  const organizationIds = typedMemberships.map((membership) => membership.organizationId);
  const { data: organizations, error: organizationsError } = await supabase
    .from('organizations')
    .select('id, name')
    .in('id', organizationIds);
  if (organizationsError) throw new Error('WORKSPACE_UNAVAILABLE');

  const names = new Map((organizations ?? []).map((organization) => [organization.id, organization.name]));
  const availableOrganizations = typedMemberships.flatMap((membership) => {
    const name = names.get(membership.organizationId);
    return name ? [{ id: membership.organizationId, name, role: membership.role }] : [];
  });
  const activeOrganization = availableOrganizations.find((organization) => organization.id === activeMembership.organizationId);
  if (!activeOrganization) throw new Error('WORKSPACE_UNAVAILABLE');

  return {
    accountEmail: user.email ?? 'Signed-in account',
    activeOrganization,
    organizations: availableOrganizations,
  };
}
