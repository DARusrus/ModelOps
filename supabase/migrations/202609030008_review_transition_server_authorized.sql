-- The application server already validates the session, permission, and target
-- card organization before calling this service-role-only function. Do not
-- repeat an auth-context-dependent membership lookup inside this RPC.

create or replace function public.attest_model_card_as(requesting_actor uuid, target_card uuid, requested_action text, requested_reason text)
returns public.review_attestations
language plpgsql security definer set search_path = public, extensions as $$
declare
  card public.model_cards%rowtype;
  predecessor text;
  event_time timestamptz := now();
  canonical_payload jsonb;
  event_digest text;
  created_event public.review_attestations%rowtype;
begin
  if requesting_actor is null then raise exception 'INVALID_ACTOR'; end if;
  if requested_action not in ('submitted', 'under_review', 'approved', 'rejected', 'changes_requested') then raise exception 'INVALID_ACTION'; end if;
  if char_length(trim(coalesce(requested_reason, ''))) not between 1 and 2000 then raise exception 'INVALID_REASON'; end if;
  select * into card from public.model_cards where id = target_card for update;
  if not found then raise exception 'MODEL_CARD_NOT_FOUND'; end if;

  if requested_action = 'submitted' and card.workflow_state not in ('draft', 'changes_requested') then raise exception 'INVALID_TRANSITION'; end if;
  if requested_action = 'under_review' and card.workflow_state <> 'submitted' then raise exception 'INVALID_TRANSITION'; end if;
  if requested_action in ('approved', 'rejected', 'changes_requested') and card.workflow_state <> 'under_review' then raise exception 'INVALID_TRANSITION'; end if;

  select digest into predecessor from public.review_attestations where model_card_id = card.id order by created_at desc limit 1;
  canonical_payload := jsonb_build_object('action', requested_action, 'actor_id', requesting_actor, 'card_id', card.id, 'evidence_snapshot', coalesce(card.payload -> 'evidence_items', '[]'::jsonb), 'occurred_at', event_time, 'previous_digest', predecessor, 'reason', trim(requested_reason), 'rubric_version', card.rubric_version);
  event_digest := encode(extensions.digest(convert_to(canonical_payload::text, 'utf8'), 'sha256'), 'hex');
  insert into public.review_attestations (organization_id, model_card_id, actor_id, action, reason, rubric_version, evidence_snapshot, previous_digest, digest, created_at)
  values (card.organization_id, card.id, requesting_actor, requested_action, trim(requested_reason), card.rubric_version, coalesce(card.payload -> 'evidence_items', '[]'::jsonb), predecessor, event_digest, event_time)
  returning * into created_event;
  update public.model_cards set workflow_state = requested_action where id = card.id;
  insert into public.audit_events (organization_id, actor_id, event_type, payload)
  values (card.organization_id, requesting_actor, 'model_card_attested', jsonb_build_object('action', requested_action, 'card_id', card.id, 'digest', event_digest));
  return created_event;
end;
$$;

revoke all on function public.attest_model_card_as(uuid, uuid, text, text) from public;
grant execute on function public.attest_model_card_as(uuid, uuid, text, text) to service_role;
