-- Production hardening: retention enforcement, verifiable ordered attestations,
-- and quota reservation release. Apply after 202609040012_idempotency_workflow.sql.

-- Review records are audits and therefore follow the approved seven-year period.
drop policy if exists "members read attestations" on public.review_attestations;
create policy "members read unexpired attestations"
on public.review_attestations for select to authenticated
using (public.is_member(organization_id) and expires_at > now());

-- Preserve the independently retained attestation when a one-year card is purged.
alter table public.review_attestations add column if not exists model_card_reference uuid;
update public.review_attestations set model_card_reference = model_card_id where model_card_reference is null;
alter table public.review_attestations alter column model_card_reference set not null;
alter table public.review_attestations alter column model_card_id drop not null;
alter table public.review_attestations drop constraint if exists review_attestations_model_card_id_fkey;
alter table public.review_attestations add constraint review_attestations_model_card_id_fkey
  foreign key (model_card_id) references public.model_cards(id) on delete set null;

alter table public.review_attestations add column if not exists sequence_no integer;
-- Existing records were created before a digest format/version was stored.
-- They remain retained, but are deliberately labelled unverifiable rather than
-- being falsely presented as verified under the new canonical representation.
alter table public.review_attestations add column if not exists digest_version text not null default 'legacy_unverifiable'
  check (digest_version in ('legacy_unverifiable', 'v2'));
with numbered as (
  select id, row_number() over (partition by model_card_id order by created_at, id)::integer as sequence_no
  from public.review_attestations
)
update public.review_attestations target
set sequence_no = numbered.sequence_no
from numbered
where target.id = numbered.id and target.sequence_no is null;
alter table public.review_attestations alter column sequence_no set not null;
create unique index if not exists review_attestations_card_sequence_idx on public.review_attestations(model_card_reference, sequence_no);
create index if not exists model_cards_expiry_idx on public.model_cards(expires_at);
create index if not exists evidence_items_expiry_idx on public.evidence_items(expires_at);
create index if not exists audit_events_expiry_idx on public.audit_events(expires_at);
create index if not exists review_attestations_expiry_idx on public.review_attestations(expires_at);

create or replace function public.release_ai_quota(target_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.ai_quota_usage
  set used_count = greatest(used_count - 1, 0)
  where organization_id = target_org
    and ((period_kind = 'day' and period_start = current_date)
      or (period_kind = 'month' and period_start = date_trunc('month', current_date)::date));
end;
$$;
revoke all on function public.release_ai_quota(uuid) from public;
grant execute on function public.release_ai_quota(uuid) to service_role;

create or replace function public.attest_model_card_as(
  requesting_actor uuid,
  target_card uuid,
  requested_action text,
  requested_reason text,
  requested_policy_id text
)
returns public.review_attestations
language plpgsql security definer set search_path = public, extensions as $$
declare
  card public.model_cards%rowtype;
  organization_review_mode text;
  actor_role public.app_role;
  predecessor text;
  next_sequence integer := 1;
  event_time timestamptz;
  canonical_payload jsonb;
  event_digest text;
  created_event public.review_attestations%rowtype;
begin
  if requesting_actor is null then raise exception 'INVALID_ACTOR'; end if;
  if requested_action not in ('submitted', 'under_review', 'approved', 'rejected', 'changes_requested') then raise exception 'INVALID_ACTION'; end if;
  if requested_policy_id not in ('healthcare_ai', 'fin_fraud_ai', 'genai_llm_ai', 'cv_edge_ai', 'enterprise_general') then raise exception 'INVALID_POLICY'; end if;
  if char_length(trim(coalesce(requested_reason, ''))) not between 1 and 2000 then raise exception 'INVALID_REASON'; end if;

  select * into card from public.model_cards where id = target_card for update;
  if not found or card.expires_at <= now() then raise exception 'MODEL_CARD_NOT_FOUND'; end if;
  select role into actor_role from public.memberships where organization_id = card.organization_id and user_id = requesting_actor;
  if actor_role is null then raise exception 'FORBIDDEN'; end if;
  if requested_action = 'submitted' and actor_role not in ('editor', 'reviewer', 'admin') then raise exception 'FORBIDDEN'; end if;
  if requested_action <> 'submitted' and actor_role not in ('reviewer', 'admin') then raise exception 'FORBIDDEN'; end if;
  select review_mode into organization_review_mode from public.organizations where id = card.organization_id;
  if organization_review_mode is null then raise exception 'ORGANIZATION_NOT_FOUND'; end if;
  if requested_action = 'approved' and organization_review_mode = 'independent_review' and card.created_by = requesting_actor then raise exception 'SELF_APPROVAL_FORBIDDEN'; end if;
  if requested_action = 'submitted' and card.workflow_state not in ('draft', 'changes_requested') then raise exception 'INVALID_TRANSITION'; end if;
  if requested_action = 'under_review' and card.workflow_state <> 'submitted' then raise exception 'INVALID_TRANSITION'; end if;
  if requested_action in ('approved', 'rejected', 'changes_requested') and card.workflow_state <> 'under_review' then raise exception 'INVALID_TRANSITION'; end if;

  select digest, sequence_no + 1 into predecessor, next_sequence
  from public.review_attestations
  where model_card_reference = card.id
  order by sequence_no desc limit 1;
  if not found then
    predecessor := null;
    next_sequence := 1;
  end if;
  event_time := clock_timestamp();
  canonical_payload := jsonb_build_object('action', requested_action, 'actor_id', requesting_actor, 'card_id', card.id, 'evidence_snapshot', coalesce(card.payload -> 'evidence_items', '[]'::jsonb), 'occurred_at', event_time, 'policy_id', requested_policy_id, 'previous_digest', predecessor, 'reason', trim(requested_reason), 'rubric_version', card.rubric_version, 'sequence_no', next_sequence);
  event_digest := encode(extensions.digest(convert_to(canonical_payload::text, 'utf8'), 'sha256'), 'hex');
  insert into public.review_attestations (organization_id, model_card_id, model_card_reference, actor_id, action, reason, rubric_version, policy_id, evidence_snapshot, previous_digest, digest, sequence_no, digest_version, created_at)
  values (card.organization_id, card.id, card.id, requesting_actor, requested_action, trim(requested_reason), card.rubric_version, requested_policy_id, coalesce(card.payload -> 'evidence_items', '[]'::jsonb), predecessor, event_digest, next_sequence, 'v2', event_time)
  returning * into created_event;
  update public.model_cards set workflow_state = requested_action, governance_policy_id = requested_policy_id where id = card.id;
  insert into public.audit_events (organization_id, actor_id, event_type, payload)
  values (card.organization_id, requesting_actor, 'model_card_attested', jsonb_build_object('action', requested_action, 'card_id', card.id, 'digest', event_digest, 'policy_id', requested_policy_id, 'review_mode', organization_review_mode, 'sequence_no', next_sequence));
  return created_event;
end;
$$;

create or replace function public.verify_model_card_attestations(target_card uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  card_org uuid;
  event record;
  prior_digest text;
  expected_digest text;
  expected_sequence integer := 1;
begin
  -- Audits outlive their one-year model-card record. Authorize verification
  -- through the independently retained attestation organization instead of
  -- relying on a card row that retention may already have removed.
  select organization_id into card_org
  from public.review_attestations
  where model_card_reference = target_card
  order by sequence_no desc
  limit 1;
  if card_org is null or not public.is_member(card_org) then raise exception 'FORBIDDEN'; end if;
  for event in select * from public.review_attestations where model_card_reference = target_card order by sequence_no loop
    if event.digest_version <> 'v2' then
      return jsonb_build_object('valid', null, 'checked_events', expected_sequence - 1, 'reason', 'LEGACY_UNVERIFIABLE');
    end if;
    if event.sequence_no <> expected_sequence or event.previous_digest is distinct from prior_digest then
      return jsonb_build_object('valid', false, 'checked_events', expected_sequence - 1, 'reason', 'SEQUENCE_OR_LINK_MISMATCH');
    end if;
    expected_digest := encode(extensions.digest(convert_to(jsonb_build_object('action', event.action, 'actor_id', event.actor_id, 'card_id', event.model_card_reference, 'evidence_snapshot', event.evidence_snapshot, 'occurred_at', event.created_at, 'policy_id', event.policy_id, 'previous_digest', event.previous_digest, 'reason', event.reason, 'rubric_version', event.rubric_version, 'sequence_no', event.sequence_no)::text, 'utf8'), 'sha256'), 'hex');
    if event.digest <> expected_digest then
      return jsonb_build_object('valid', false, 'checked_events', expected_sequence - 1, 'reason', 'DIGEST_MISMATCH');
    end if;
    prior_digest := event.digest;
    expected_sequence := expected_sequence + 1;
  end loop;
  return jsonb_build_object('valid', true, 'checked_events', expected_sequence - 1);
end;
$$;
revoke all on function public.verify_model_card_attestations(uuid) from public;
grant execute on function public.verify_model_card_attestations(uuid) to authenticated;

-- Invoke from a trusted scheduler once daily. This function intentionally does
-- not create a pg_cron job because extension availability is deployment-owned.
create or replace function public.purge_expired_governance_records()
returns jsonb language plpgsql security definer set search_path = public as $$
declare deleted_cards integer; deleted_audit integer; deleted_attestations integer; deleted_idempotency integer;
begin
  delete from public.model_cards where expires_at <= now(); get diagnostics deleted_cards = row_count;
  delete from public.audit_events where expires_at <= now(); get diagnostics deleted_audit = row_count;
  delete from public.review_attestations where expires_at <= now(); get diagnostics deleted_attestations = row_count;
  delete from public.idempotency_records where expires_at <= now(); get diagnostics deleted_idempotency = row_count;
  delete from public.ai_quota_usage where (period_kind = 'day' and period_start < current_date - 40) or (period_kind = 'month' and period_start < (date_trunc('month', current_date) - interval '14 months')::date);
  return jsonb_build_object('model_cards', deleted_cards, 'audit_events', deleted_audit, 'review_attestations', deleted_attestations, 'idempotency_records', deleted_idempotency);
end;
$$;
revoke all on function public.purge_expired_governance_records() from public;
grant execute on function public.purge_expired_governance_records() to service_role;
