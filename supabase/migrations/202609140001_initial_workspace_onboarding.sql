-- Atomic, self-service creation of one initial workspace per confirmed user.
-- The function derives the actor from the verified Supabase session and accepts
-- no caller-controlled user ID or role.
alter table public.organizations
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create unique index if not exists organizations_one_initial_workspace_per_creator_idx
  on public.organizations(created_by)
  where created_by is not null;

create or replace function public.create_initial_workspace(workspace_name text)
returns table (
  organization_id uuid,
  organization_name text,
  organization_role public.app_role,
  created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  normalized_name text := trim(workspace_name);
  existing_organization public.organizations%rowtype;
  existing_role public.app_role;
  new_organization public.organizations%rowtype;
begin
  if actor is null then
    raise exception using errcode = 'P0001', message = 'AUTH_CONTEXT_MISSING';
  end if;

  if not exists (
    select 1 from auth.users
    where id = actor and email_confirmed_at is not null
  ) then
    raise exception using errcode = 'P0001', message = 'EMAIL_CONFIRMATION_REQUIRED';
  end if;

  if char_length(normalized_name) not between 1 and 120
     or normalized_name ~ '[[:cntrl:]]' then
    raise exception using errcode = 'P0001', message = 'WORKSPACE_NAME_INVALID';
  end if;

  -- Serialize this actor's onboarding attempts. This prevents duplicate
  -- organizations while keeping contention isolated to one user.
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));

  select *
  into existing_organization
  from public.organizations
  where created_by = actor;

  if found then
    select role
    into existing_role
    from public.memberships
    where organization_id = existing_organization.id
      and user_id = actor;

    if existing_role is null then
      raise exception using errcode = 'P0001', message = 'WORKSPACE_ALREADY_CREATED';
    end if;

    return query
      select existing_organization.id, existing_organization.name, existing_role, false;
    return;
  end if;

  insert into public.organizations (name, created_by)
  values (normalized_name, actor)
  returning * into new_organization;

  insert into public.memberships (organization_id, user_id, role)
  values (new_organization.id, actor, 'admin');

  insert into public.audit_events (organization_id, actor_id, event_type, payload)
  values (
    new_organization.id,
    actor,
    'organization_created',
    jsonb_build_object('organization_id', new_organization.id)
  );

  return query
    select new_organization.id, new_organization.name, 'admin'::public.app_role, true;
end;
$$;

revoke all on function public.create_initial_workspace(text) from public;
grant execute on function public.create_initial_workspace(text) to authenticated;

comment on function public.create_initial_workspace(text) is
  'Creates or idempotently returns the authenticated confirmed user''s one initial workspace.';
