-- The function returns columns named user_id and role. In PL/pgSQL those
-- output variables share the function scope, so authorization predicates must
-- qualify the memberships columns to avoid PostgreSQL error 42702.

create or replace function public.list_organization_members_as(
  requesting_actor uuid,
  target_organization uuid
)
returns table (
  user_id uuid,
  email text,
  role public.app_role,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.memberships as requester_membership
    where requester_membership.organization_id = target_organization
      and requester_membership.user_id = requesting_actor
      and requester_membership.role = 'admin'
  ) then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;

  return query
    select
      member_membership.user_id,
      account.email::text,
      member_membership.role,
      member_membership.created_at
    from public.memberships as member_membership
    join auth.users as account on account.id = member_membership.user_id
    where member_membership.organization_id = target_organization
    order by member_membership.created_at, member_membership.user_id;
end;
$$;

revoke execute on function public.list_organization_members_as(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.list_organization_members_as(uuid, uuid)
  to service_role;
