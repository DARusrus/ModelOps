-- Phase C: persist evidence atomically with its card and restrict workflow changes
-- to the authorized state-machine function below.

create or replace function public.persist_model_card_evidence()
returns trigger language plpgsql security definer set search_path = public as $$
declare item jsonb;
begin
  for item in select value from jsonb_array_elements(coalesce(new.payload -> 'evidence_items', '[]'::jsonb)) loop
    insert into public.evidence_items (organization_id, model_card_id, created_by, kind, payload, expires_at)
    values (new.organization_id, new.id, new.created_by, item ->> 'kind', item, new.expires_at);
  end loop;
  return new;
end;
$$;

drop trigger if exists model_card_evidence_trigger on public.model_cards;
create trigger model_card_evidence_trigger
after insert on public.model_cards for each row execute function public.persist_model_card_evidence();

create or replace function public.attest_model_card(target_card uuid, requested_action text, requested_reason text)
returns public.review_attestations
language plpgsql security definer set search_path = public, extensions as $$
declare
  card public.model_cards%rowtype;
  current_role public.app_role;
  predecessor text;
  event_time timestamptz := now();
  canonical_payload jsonb;
  event_digest text;
  created_event public.review_attestations%rowtype;
begin
  select * into card from public.model_cards where id = target_card;
  if not found then raise exception 'MODEL_CARD_NOT_FOUND'; end if;
  select role into current_role from public.memberships where organization_id = card.organization_id and user_id = auth.uid();
  if current_role is null then raise exception 'FORBIDDEN'; end if;
  if char_length(trim(requested_reason)) not between 1 and 2000 then raise exception 'INVALID_REASON'; end if;
  if requested_action not in ('submitted', 'under_review', 'approved', 'rejected', 'changes_requested') then raise exception 'INVALID_ACTION'; end if;
  if (requested_action = 'submitted' and current_role not in ('editor','reviewer','admin')) or (requested_action <> 'submitted' and current_role not in ('reviewer','admin')) then raise exception 'FORBIDDEN'; end if;
  if not ((card.workflow_state = 'draft' and requested_action = 'submitted') or (card.workflow_state = 'submitted' and requested_action = 'under_review') or (card.workflow_state = 'under_review' and requested_action in ('approved','rejected','changes_requested')) or (card.workflow_state = 'changes_requested' and requested_action = 'submitted')) then raise exception 'INVALID_TRANSITION'; end if;

  select digest into predecessor from public.review_attestations where model_card_id = card.id order by created_at desc limit 1;
  canonical_payload := jsonb_build_object('action', requested_action, 'actor_id', auth.uid(), 'card_id', card.id, 'evidence_snapshot', coalesce(card.payload -> 'evidence_items', '[]'::jsonb), 'occurred_at', event_time, 'previous_digest', predecessor, 'reason', trim(requested_reason), 'rubric_version', card.rubric_version);
  event_digest := encode(extensions.digest(convert_to(canonical_payload::text, 'utf8'), 'sha256'), 'hex');

  insert into public.review_attestations (organization_id, model_card_id, actor_id, action, reason, rubric_version, evidence_snapshot, previous_digest, digest, created_at)
  values (card.organization_id, card.id, auth.uid(), requested_action, trim(requested_reason), card.rubric_version, coalesce(card.payload -> 'evidence_items', '[]'::jsonb), predecessor, event_digest, event_time)
  returning * into created_event;
  update public.model_cards set workflow_state = requested_action where id = card.id;
  insert into public.audit_events (organization_id, actor_id, event_type, payload)
  values (card.organization_id, auth.uid(), 'model_card_attested', jsonb_build_object('action', requested_action, 'card_id', card.id, 'digest', event_digest));
  return created_event;
end;
$$;

revoke all on function public.persist_model_card_evidence() from public;
revoke all on function public.attest_model_card(uuid, text, text) from public;
grant execute on function public.attest_model_card(uuid, text, text) to authenticated;
