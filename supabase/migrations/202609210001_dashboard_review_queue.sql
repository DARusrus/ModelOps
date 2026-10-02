-- Bounded organization dashboard and reviewer work queue.
-- Both functions are service-role only and re-check the requesting actor so
-- browser input can never select an organization or elevate a role.

create index if not exists model_cards_review_queue_idx
  on public.model_cards (organization_id, created_at desc, id desc)
  include (workflow_state, model_name, model_version, readiness_score, created_by, expires_at)
  where workflow_state in ('submitted', 'under_review');

-- Exact state counts still inspect every active entry in the organization, but
-- this compact covering index avoids reading large model-card JSON payloads.
create index if not exists model_cards_dashboard_counts_idx
  on public.model_cards (organization_id, expires_at)
  include (workflow_state);

create or replace function public.get_dashboard_snapshot_as(
  requesting_actor uuid,
  target_organization uuid,
  recent_limit integer default 5
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  counts record;
  recent_evaluations jsonb;
  recent_activity jsonb;
begin
  if requesting_actor is null or target_organization is null then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;
  if recent_limit not between 1 and 10 then
    raise exception using errcode = '22023', message = 'INVALID_LIMIT';
  end if;
  if not exists (
    select 1
    from public.memberships as membership
    where membership.organization_id = target_organization
      and membership.user_id = requesting_actor
  ) then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;

  select
    count(*)::integer as active_evaluations,
    count(*) filter (where card.workflow_state in ('submitted', 'under_review'))::integer as review_required,
    count(*) filter (where card.workflow_state = 'draft')::integer as draft_count,
    count(*) filter (where card.workflow_state = 'submitted')::integer as submitted_count,
    count(*) filter (where card.workflow_state = 'under_review')::integer as under_review_count,
    count(*) filter (where card.workflow_state = 'approved')::integer as approved_count,
    count(*) filter (where card.workflow_state = 'rejected')::integer as rejected_count,
    count(*) filter (where card.workflow_state = 'changes_requested')::integer as changes_requested_count
  into counts
  from public.model_cards as card
  where card.organization_id = target_organization
    and card.expires_at > now();

  select coalesce(jsonb_agg(to_jsonb(recent_row) order by recent_row.created_at desc, recent_row.id desc), '[]'::jsonb)
  into recent_evaluations
  from (
    select
      card.id,
      card.model_name,
      card.model_version as version,
      card.readiness_score,
      card.workflow_state,
      card.created_at
    from public.model_cards as card
    where card.organization_id = target_organization
      and card.expires_at > now()
    order by card.created_at desc, card.id desc
    limit recent_limit
  ) as recent_row;

  select coalesce(jsonb_agg(to_jsonb(activity_row) order by activity_row.created_at desc, activity_row.id desc), '[]'::jsonb)
  into recent_activity
  from (
    select
      event.id,
      event.event_type,
      event.actor_id = requesting_actor as actor_is_current_user,
      case
        when event.event_type in ('model_card_created', 'model_card_attested')
          and coalesce(event.payload ->> 'card_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (event.payload ->> 'card_id')::uuid
        else null
      end as card_id,
      case
        when event.event_type = 'model_card_attested'
          and event.payload ->> 'action' in ('submitted', 'under_review', 'approved', 'rejected', 'changes_requested')
        then event.payload ->> 'action'
        else null
      end as review_action,
      event.created_at
    from public.audit_events as event
    where event.organization_id = target_organization
      and event.expires_at > now()
      and event.event_type in (
        'organization_created',
        'model_card_created',
        'model_card_attested',
        'organization_invitation_created',
        'organization_invitation_renewed',
        'organization_invitation_revoked',
        'organization_invitation_accepted',
        'organization_member_role_changed',
        'organization_member_removed'
      )
    order by event.created_at desc, event.id desc
    limit recent_limit
  ) as activity_row;

  return jsonb_build_object(
    'active_evaluations', counts.active_evaluations,
    'review_required', counts.review_required,
    'workflow_counts', jsonb_build_object(
      'draft', counts.draft_count,
      'submitted', counts.submitted_count,
      'under_review', counts.under_review_count,
      'approved', counts.approved_count,
      'rejected', counts.rejected_count,
      'changes_requested', counts.changes_requested_count
    ),
    'recent_evaluations', recent_evaluations,
    'recent_activity', recent_activity
  );
end;
$$;

create or replace function public.list_review_queue_as(
  requesting_actor uuid,
  target_organization uuid,
  requested_state text default null,
  requested_limit integer default 21,
  cursor_created_at timestamptz default null,
  cursor_id uuid default null
)
returns table (
  id uuid,
  model_name text,
  version text,
  readiness_score numeric,
  workflow_state text,
  author_email text,
  created_at timestamptz,
  last_review_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if requesting_actor is null or target_organization is null or not exists (
    select 1
    from public.memberships as membership
    where membership.organization_id = target_organization
      and membership.user_id = requesting_actor
      and membership.role in ('reviewer', 'admin')
  ) then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;
  if requested_state is not null and requested_state not in ('submitted', 'under_review') then
    raise exception using errcode = '22023', message = 'INVALID_STATE';
  end if;
  if requested_limit not between 1 and 51 then
    raise exception using errcode = '22023', message = 'INVALID_LIMIT';
  end if;
  if (cursor_created_at is null) <> (cursor_id is null) then
    raise exception using errcode = '22023', message = 'INVALID_CURSOR';
  end if;

  return query
    select
      card.id,
      card.model_name,
      card.model_version as version,
      card.readiness_score,
      card.workflow_state,
      author.email::text as author_email,
      card.created_at,
      latest_review.created_at as last_review_at
    from public.model_cards as card
    join auth.users as author on author.id = card.created_by
    left join lateral (
      select attestation.created_at
      from public.review_attestations as attestation
      where attestation.model_card_reference = card.id
      order by attestation.sequence_no desc
      limit 1
    ) as latest_review on true
    where card.organization_id = target_organization
      and card.expires_at > now()
      and card.workflow_state in ('submitted', 'under_review')
      and (requested_state is null or card.workflow_state = requested_state)
      and (
        cursor_created_at is null
        or card.created_at < cursor_created_at
        or (card.created_at = cursor_created_at and card.id < cursor_id)
      )
    order by card.created_at desc, card.id desc
    limit requested_limit;
end;
$$;

revoke execute on function public.get_dashboard_snapshot_as(uuid, uuid, integer)
  from public, anon, authenticated;
revoke execute on function public.list_review_queue_as(uuid, uuid, text, integer, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.get_dashboard_snapshot_as(uuid, uuid, integer)
  to service_role;
grant execute on function public.list_review_queue_as(uuid, uuid, text, integer, timestamptz, uuid)
  to service_role;
