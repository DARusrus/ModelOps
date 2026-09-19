-- Remove PL/pgSQL name ambiguity from invitation acceptance. The function's
-- organization_id output variable previously collided with unqualified SQL
-- column references, including the ON CONFLICT inference list.

create or replace function public.accept_organization_invitation(target_invitation uuid)
returns table (organization_id uuid, organization_name text, organization_role public.app_role, accepted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  actor_email text;
  invitation public.organization_invitations%rowtype;
  assigned_role public.app_role;
  target_name text;
begin
  if actor is null then raise exception using errcode = 'P0001', message = 'AUTH_CONTEXT_MISSING'; end if;
  select lower(account.email) into actor_email
  from auth.users as account
  where account.id = actor and account.email_confirmed_at is not null;
  if actor_email is null then raise exception using errcode = 'P0001', message = 'EMAIL_CONFIRMATION_REQUIRED'; end if;

  select pending.* into invitation
  from public.organization_invitations as pending
  where pending.id = target_invitation
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'INVITATION_NOT_FOUND'; end if;

  if invitation.status = 'accepted' and invitation.accepted_by = actor then
    select membership.role into assigned_role
    from public.memberships as membership
    where membership.organization_id = invitation.organization_id
      and membership.user_id = actor;
    select organization.name into target_name
    from public.organizations as organization
    where organization.id = invitation.organization_id;
    return query select invitation.organization_id, target_name, assigned_role, false;
    return;
  end if;
  if invitation.status <> 'pending' then raise exception using errcode = 'P0001', message = 'INVITATION_NOT_PENDING'; end if;
  if invitation.expires_at <= now() then raise exception using errcode = 'P0001', message = 'INVITATION_EXPIRED'; end if;
  if invitation.email <> actor_email then raise exception using errcode = 'P0001', message = 'INVITATION_EMAIL_MISMATCH'; end if;

  insert into public.memberships (organization_id, user_id, role)
  values (invitation.organization_id, actor, invitation.role)
  on conflict on constraint memberships_pkey do nothing;

  select membership.role into assigned_role
  from public.memberships as membership
  where membership.organization_id = invitation.organization_id
    and membership.user_id = actor;

  update public.organization_invitations as accepted_invitation
  set status = 'accepted', accepted_at = now(), accepted_by = actor
  where accepted_invitation.id = invitation.id;

  insert into public.audit_events (organization_id, actor_id, event_type, payload)
  values (
    invitation.organization_id,
    actor,
    'organization_invitation_accepted',
    jsonb_build_object('invitation_id', invitation.id, 'role', assigned_role)
  );
  select organization.name into target_name
  from public.organizations as organization
  where organization.id = invitation.organization_id;
  return query select invitation.organization_id, target_name, assigned_role, true;
end;
$$;

revoke all on function public.accept_organization_invitation(uuid) from public, anon;
grant execute on function public.accept_organization_invitation(uuid) to authenticated;
