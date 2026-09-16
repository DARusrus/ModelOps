-- Qualify membership columns in the initial-workspace replay path. The
-- function's TABLE return columns are PL/pgSQL variables, so an unqualified
-- organization_id is ambiguous once an existing workspace is returned.
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
    select 1 from auth.users as users
    where users.id = actor and users.email_confirmed_at is not null
  ) then
    raise exception using errcode = 'P0001', message = 'EMAIL_CONFIRMATION_REQUIRED';
  end if;

  if char_length(normalized_name) not between 1 and 120
     or normalized_name ~ '[[:cntrl:]]' then
    raise exception using errcode = 'P0001', message = 'WORKSPACE_NAME_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));

  select organizations.*
  into existing_organization
  from public.organizations as organizations
  where organizations.created_by = actor;

  if found then
    select memberships.role
    into existing_role
    from public.memberships as memberships
    where memberships.organization_id = existing_organization.id
      and memberships.user_id = actor;

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
