import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canPerform, type Role } from '@/lib/auth/permissions';
import { cookies } from 'next/headers';
export type { Role } from '@/lib/auth/permissions';

export async function requireActor(organizationId: string, permission: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  const { data: membership } = await supabase.from('memberships').select('role').eq('organization_id', organizationId).eq('user_id', user.id).maybeSingle();
  const role = membership?.role as Role | undefined;
  if (!role || !canPerform(role, permission)) throw new Error('FORBIDDEN');
  return { userId: user.id, organizationId, role };
}

export async function requireDefaultActor(permission: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  const activeOrganizationId = (await cookies()).get('modelops-active-organization')?.value;
  if (activeOrganizationId) {
    const { data: membership } = await supabase.from('memberships').select('organization_id, role').eq('organization_id', activeOrganizationId).eq('user_id', user.id).maybeSingle();
    const role = membership?.role as Role | undefined;
    if (!membership || !role) throw new Error('ORGANIZATION_SELECTION_REQUIRED');
    if (!canPerform(role, permission)) throw new Error('FORBIDDEN');
    return { userId: user.id, organizationId: membership.organization_id, role };
  }
  const { data: memberships } = await supabase.from('memberships').select('organization_id, role').eq('user_id', user.id).limit(2);
  if (!memberships || memberships.length !== 1) throw new Error('ORGANIZATION_SELECTION_REQUIRED');
  const membership = memberships[0];
  const role = membership.role as Role;
  if (!canPerform(role, permission)) throw new Error('FORBIDDEN');
  return { userId: user.id, organizationId: membership.organization_id, role };
}
