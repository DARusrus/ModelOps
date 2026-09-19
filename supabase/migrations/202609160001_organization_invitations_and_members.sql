-- Organization invitations and server-owned member administration.
-- Invitations expire after seven days. Accepted, revoked, and long-expired
-- invitation PII is removed after a further 30-day operational window.

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (
    email = lower(trim(email))
    and char_length(email) between 3 and 320
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  role public.app_role not null,
  invited_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  constraint organization_invitations_terminal_state check (
    (status = 'accepted' and accepted_at is not null and accepted_by is not null and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null and accepted_at is null and accepted_by is null)
    or (status in ('pending', 'expired') and accepted_at is null and accepted_by is null and revoked_at is null)
  )
);

create unique index organization_invitations_one_pending_email_idx
  on public.organization_invitations (organization_id, email)
  where status = 'pending';
create index organization_invitations_expiry_idx on public.organization_invitations (expires_at);
create index organization_invitations_org_created_idx on public.organization_invitations (organization_id, created_at desc, id desc);

alter table public.organization_invitations enable row level security;
create policy "admins read organization invitations"
  on public.organization_invitations for select to authenticated
  using (public.has_role(organization_id, array['admin']::public.app_role[]));

revoke all on public.organization_invitations from anon, authenticated;
grant select on public.organization_invitations to authenticated;

create function public.create_organization_invitation_as(
  requesting_actor uuid,
  target_organization uuid,
  target_email text,
  requested_role public.app_role
)
returns table (
  invitation_id uuid,
  invitation_email text,
  invitation_role public.app_role,
  invitation_expires_at timestamptz,
  invitation_created_at timestamptz,
  recipient_exists boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(target_email));
  invitation public.organization_invitations%rowtype;
begin
  if requesting_actor is null or target_organization is null then
    raise exception using errcode = 'P0001', message = 'INVALID_ACTOR';
  end if;
  if not exists (
    select 1 from public.memberships
    where organization_id = target_organization
      and user_id = requesting_actor
      and role = 'admin'
  ) then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;
  if char_length(normalized_email) not between 3 and 320
     or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = 'P0001', message = 'INVALID_EMAIL';
  end if;
  if exists (
    select 1 from public.memberships membership
    join auth.users account on account.id = membership.user_id
    where membership.organization_id = target_organization
      and lower(account.email) = normalized_email
  ) then
    raise exception using errcode = 'P0001', message = 'ALREADY_MEMBER';
  end if;

  -- Serialize retries for one organization/email pair so concurrent requests
  -- update one pending invitation instead of racing the partial unique index.
  perform pg_advisory_xact_lock(hashtextextended(target_organization::text || ':' || normalized_email, 2));

  update public.organization_invitations
  set role = requested_role,
      invited_by = requesting_actor,
      expires_at = now() + interval '7 days'
  where organization_id = target_organization
    and email = normalized_email
    and status = 'pending'
  returning * into invitation;

  if not found then
    insert into public.organization_invitations (organization_id, email, role, invited_by)
    values (target_organization, normalized_email, requested_role, requesting_actor)
    returning * into invitation;
  end if;

  insert into public.audit_events (organization_id, actor_id, event_type, payload)
  values (
    target_organization,
    requesting_actor,
    'organization_invitation_created',
    jsonb_build_object('invitation_id', invitation.id, 'role', invitation.role)
  );

  return query select
    invitation.id,
    invitation.email,
    invitation.role,
    invitation.expires_at,
    invitation.created_at,
    exists (select 1 from auth.users where lower(email) = normalized_email);
end;
$$;

create function public.renew_organization_invitation_as(
  requesting_actor uuid,
  target_invitation uuid
)
returns table (
  invitation_id uuid,
  invitation_email text,
  invitation_role public.app_role,
  invitation_expires_at timestamptz,
  invitation_created_at timestamptz,
  recipient_exists boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.organization_invitations%rowtype;
begin
  select * into invitation
  from public.organization_invitations
  where id = target_invitation
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'INVITATION_NOT_FOUND'; end if;
  if not exists (
    select 1 from public.memberships
    where organization_id = invitation.organization_id
      and user_id = requesting_actor
      and role = 'admin'
  ) then raise exception using errcode = 'P0001', message = 'FORBIDDEN'; end if;
  if invitation.status <> 'pending' then raise exception using errcode = 'P0001', message = 'INVITATION_NOT_PENDING'; end if;

  update public.organization_invitations
  set invited_by = requesting_actor, expires_at = now() + interval '7 days'
  where id = target_invitation
  returning * into invitation;

  insert into public.audit_events (organization_id, actor_id, event_type, payload)
  values (invitation.organization_id, requesting_actor, 'organization_invitation_renewed', jsonb_build_object('invitation_id', invitation.id));
  return query select
    invitation.id,
    invitation.email,
    invitation.role,
    invitation.expires_at,
    invitation.created_at,
    exists (select 1 from auth.users where lower(email) = invitation.email);
end;
$$;

create function public.revoke_organization_invitation_as(
  requesting_actor uuid,
  target_invitation uuid
)
returns public.organization_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.organization_invitations%rowtype;
begin
  select * into invitation
  from public.organization_invitations
  where id = target_invitation
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'INVITATION_NOT_FOUND'; end if;
  if not exists (
    select 1 from public.memberships
    where organization_id = invitation.organization_id
      and user_id = requesting_actor
      and role = 'admin'
  ) then raise exception using errcode = 'P0001', message = 'FORBIDDEN'; end if;
  if invitation.status <> 'pending' then raise exception using errcode = 'P0001', message = 'INVITATION_NOT_PENDING'; end if;

  update public.organization_invitations
  set status = 'revoked', revoked_at = now()
  where id = target_invitation
  returning * into invitation;

  insert into public.audit_events (organization_id, actor_id, event_type, payload)
  values (invitation.organization_id, requesting_actor, 'organization_invitation_revoked', jsonb_build_object('invitation_id', invitation.id));
  return invitation;
end;
$$;

create function public.accept_organization_invitation(target_invitation uuid)
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
  select lower(email) into actor_email from auth.users where id = actor and email_confirmed_at is not null;
  if actor_email is null then raise exception using errcode = 'P0001', message = 'EMAIL_CONFIRMATION_REQUIRED'; end if;

  select * into invitation
  from public.organization_invitations
  where id = target_invitation
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'INVITATION_NOT_FOUND'; end if;

  if invitation.status = 'accepted' and invitation.accepted_by = actor then
    select role into assigned_role from public.memberships
    where organization_id = invitation.organization_id and user_id = actor;
    select name into target_name from public.organizations where id = invitation.organization_id;
    return query select invitation.organization_id, target_name, assigned_role, false;
    return;
  end if;
  if invitation.status <> 'pending' then raise exception using errcode = 'P0001', message = 'INVITATION_NOT_PENDING'; end if;
  if invitation.expires_at <= now() then raise exception using errcode = 'P0001', message = 'INVITATION_EXPIRED'; end if;
  if invitation.email <> actor_email then raise exception using errcode = 'P0001', message = 'INVITATION_EMAIL_MISMATCH'; end if;

  insert into public.memberships (organization_id, user_id, role)
  values (invitation.organization_id, actor, invitation.role)
  on conflict (organization_id, user_id) do nothing;

  select role into assigned_role from public.memberships
  where organization_id = invitation.organization_id and user_id = actor;

  update public.organization_invitations
  set status = 'accepted', accepted_at = now(), accepted_by = actor
  where id = invitation.id;

  insert into public.audit_events (organization_id, actor_id, event_type, payload)
  values (
    invitation.organization_id,
    actor,
    'organization_invitation_accepted',
    jsonb_build_object('invitation_id', invitation.id, 'role', assigned_role)
  );
  select name into target_name from public.organizations where id = invitation.organization_id;
  return query select invitation.organization_id, target_name, assigned_role, true;
end;
$$;

create function public.list_organization_members_as(requesting_actor uuid, target_organization uuid)
returns table (user_id uuid, email text, role public.app_role, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.memberships
    where organization_id = target_organization
      and user_id = requesting_actor
      and role = 'admin'
  ) then raise exception using errcode = 'P0001', message = 'FORBIDDEN'; end if;

  return query
    select membership.user_id, account.email::text, membership.role, membership.created_at
    from public.memberships membership
    join auth.users account on account.id = membership.user_id
    where membership.organization_id = target_organization
    order by membership.created_at, membership.user_id;
end;
$$;

create function public.change_organization_member_role_as(
  requesting_actor uuid,
  target_organization uuid,
  target_user uuid,
  requested_role public.app_role
)
returns public.memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  current_membership public.memberships%rowtype;
  updated_membership public.memberships%rowtype;
begin
  if not exists (
    select 1 from public.memberships
    where organization_id = target_organization
      and user_id = requesting_actor
      and role = 'admin'
  ) then raise exception using errcode = 'P0001', message = 'FORBIDDEN'; end if;

  -- Serialize all administrator-count changes in this organization. Without
  -- this lock, two admins could concurrently demote/remove themselves after
  -- both observed an administrator count of two.
  perform pg_advisory_xact_lock(hashtextextended(target_organization::text, 3));

  select * into current_membership from public.memberships
  where organization_id = target_organization and user_id = target_user
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'MEMBER_NOT_FOUND'; end if;

  if current_membership.role = 'admin' and requested_role <> 'admin'
     and (select count(*) from public.memberships where organization_id = target_organization and role = 'admin') <= 1 then
    raise exception using errcode = 'P0001', message = 'FINAL_ADMIN_REQUIRED';
  end if;

  update public.memberships set role = requested_role
  where organization_id = target_organization and user_id = target_user
  returning * into updated_membership;

  insert into public.audit_events (organization_id, actor_id, event_type, payload)
  values (
    target_organization,
    requesting_actor,
    'organization_member_role_changed',
    jsonb_build_object('target_user_id', target_user, 'previous_role', current_membership.role, 'role', requested_role)
  );
  return updated_membership;
end;
$$;

create function public.remove_organization_member_as(
  requesting_actor uuid,
  target_organization uuid,
  target_user uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_membership public.memberships%rowtype;
begin
  if not exists (
    select 1 from public.memberships
    where organization_id = target_organization
      and user_id = requesting_actor
      and role = 'admin'
  ) then raise exception using errcode = 'P0001', message = 'FORBIDDEN'; end if;

  perform pg_advisory_xact_lock(hashtextextended(target_organization::text, 3));

  select * into current_membership from public.memberships
  where organization_id = target_organization and user_id = target_user
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'MEMBER_NOT_FOUND'; end if;
  if current_membership.role = 'admin'
     and (select count(*) from public.memberships where organization_id = target_organization and role = 'admin') <= 1 then
    raise exception using errcode = 'P0001', message = 'FINAL_ADMIN_REQUIRED';
  end if;

  delete from public.memberships
  where organization_id = target_organization and user_id = target_user;
  insert into public.audit_events (organization_id, actor_id, event_type, payload)
  values (target_organization, requesting_actor, 'organization_member_removed', jsonb_build_object('target_user_id', target_user, 'role', current_membership.role));
  return target_user;
end;
$$;

revoke all on function public.create_organization_invitation_as(uuid, uuid, text, public.app_role) from public;
revoke all on function public.renew_organization_invitation_as(uuid, uuid) from public;
revoke all on function public.revoke_organization_invitation_as(uuid, uuid) from public;
revoke all on function public.accept_organization_invitation(uuid) from public;
revoke all on function public.list_organization_members_as(uuid, uuid) from public;
revoke all on function public.change_organization_member_role_as(uuid, uuid, uuid, public.app_role) from public;
revoke all on function public.remove_organization_member_as(uuid, uuid, uuid) from public;
grant execute on function public.create_organization_invitation_as(uuid, uuid, text, public.app_role) to service_role;
grant execute on function public.renew_organization_invitation_as(uuid, uuid) to service_role;
grant execute on function public.revoke_organization_invitation_as(uuid, uuid) to service_role;
grant execute on function public.accept_organization_invitation(uuid) to authenticated;
grant execute on function public.list_organization_members_as(uuid, uuid) to service_role;
grant execute on function public.change_organization_member_role_as(uuid, uuid, uuid, public.app_role) to service_role;
grant execute on function public.remove_organization_member_as(uuid, uuid, uuid) to service_role;

create or replace function public.purge_expired_governance_records()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  deleted_cards integer;
  deleted_evidence integer;
  deleted_audit integer;
  deleted_attestations integer;
  deleted_idempotency integer;
  deleted_invitations integer;
begin
  update public.organization_invitations
  set status = 'expired'
  where status = 'pending' and expires_at <= now();

  delete from public.organization_invitations
  where (status = 'expired' and expires_at <= now() - interval '30 days')
     or (status = 'accepted' and accepted_at <= now() - interval '30 days')
     or (status = 'revoked' and revoked_at <= now() - interval '30 days');
  get diagnostics deleted_invitations = row_count;

  delete from public.evidence_items where expires_at <= now();
  get diagnostics deleted_evidence = row_count;
  delete from public.model_cards where expires_at <= now();
  get diagnostics deleted_cards = row_count;
  delete from public.audit_events where expires_at <= now();
  get diagnostics deleted_audit = row_count;
  delete from public.review_attestations where expires_at <= now();
  get diagnostics deleted_attestations = row_count;
  delete from public.idempotency_records where expires_at <= now();
  get diagnostics deleted_idempotency = row_count;
  delete from public.ai_quota_usage
  where (period_kind = 'day' and period_start < current_date - 40)
    or (period_kind = 'month' and period_start < (date_trunc('month', current_date) - interval '14 months')::date);

  return jsonb_build_object(
    'model_cards', deleted_cards,
    'evidence_items', deleted_evidence,
    'audit_events', deleted_audit,
    'review_attestations', deleted_attestations,
    'idempotency_records', deleted_idempotency,
    'organization_invitations', deleted_invitations
  );
end;
$$;

revoke all on function public.purge_expired_governance_records() from public;
grant execute on function public.purge_expired_governance_records() to service_role;
