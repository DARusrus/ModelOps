-- Make each durable mutation and its idempotency completion one PostgreSQL
-- transaction. Existing claim/replay behavior remains unchanged.

create or replace function public.persist_model_card_idempotently(
  target_org uuid,
  requesting_actor uuid,
  target_operation text,
  target_key uuid,
  target_fingerprint text,
  card_payload jsonb,
  card_readiness_score numeric,
  card_rubric_version text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claim public.idempotency_records%rowtype;
  actor_role public.app_role;
  created_card_id uuid;
  response_body jsonb;
begin
  if target_operation <> 'evaluation.create' then raise exception 'INVALID_OPERATION'; end if;
  if target_fingerprint is null or target_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_FINGERPRINT'; end if;
  if jsonb_typeof(card_payload) <> 'object' then raise exception 'INVALID_CARD_PAYLOAD'; end if;
  if card_readiness_score not between 0 and 100 then raise exception 'INVALID_READINESS_SCORE'; end if;
  if char_length(trim(coalesce(card_rubric_version, ''))) not between 1 and 120 then raise exception 'INVALID_RUBRIC_VERSION'; end if;

  select * into claim
  from public.idempotency_records
  where organization_id = target_org
    and actor_id = requesting_actor
    and operation = target_operation
    and idempotency_key = target_key
  for update;
  if not found
    or claim.state <> 'processing'
    or claim.request_fingerprint is distinct from target_fingerprint
    or claim.expires_at <= now()
  then
    raise exception 'IDEMPOTENCY_CLAIM_INVALID';
  end if;

  select role into actor_role
  from public.memberships
  where organization_id = target_org and user_id = requesting_actor;
  if actor_role is null or actor_role not in ('editor', 'reviewer', 'admin') then raise exception 'FORBIDDEN'; end if;

  insert into public.model_cards (
    organization_id, created_by, payload, readiness_score, rubric_version, workflow_state
  ) values (
    target_org, requesting_actor, card_payload, card_readiness_score, card_rubric_version, 'draft'
  ) returning id into created_card_id;

  response_body := card_payload || jsonb_build_object('record_id', created_card_id);
  perform public.complete_idempotency(
    target_org, requesting_actor, target_operation, target_key,
    target_fingerprint, 200, response_body
  );

  insert into public.audit_events (organization_id, actor_id, event_type, payload)
  values (target_org, requesting_actor, 'model_card_created', jsonb_build_object('card_id', created_card_id));

  return response_body;
end;
$$;

create or replace function public.attest_model_card_idempotently(
  target_org uuid,
  requesting_actor uuid,
  target_card uuid,
  requested_action text,
  requested_reason text,
  requested_policy_id text,
  target_operation text,
  target_key uuid,
  target_fingerprint text,
  response_policy jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claim public.idempotency_records%rowtype;
  created_event public.review_attestations%rowtype;
  public_attestation jsonb;
  response_body jsonb;
begin
  if target_card is null or target_operation <> ('review.' || target_card::text) then raise exception 'INVALID_OPERATION'; end if;
  if target_fingerprint is null or target_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_FINGERPRINT'; end if;
  if jsonb_typeof(response_policy) <> 'object' then raise exception 'INVALID_POLICY_RESPONSE'; end if;

  select * into claim
  from public.idempotency_records
  where organization_id = target_org
    and actor_id = requesting_actor
    and operation = target_operation
    and idempotency_key = target_key
  for update;
  if not found
    or claim.state <> 'processing'
    or claim.request_fingerprint is distinct from target_fingerprint
    or claim.expires_at <= now()
  then
    raise exception 'IDEMPOTENCY_CLAIM_INVALID';
  end if;

  select * into created_event
  from public.attest_model_card_as(
    requesting_actor, target_card, requested_action, requested_reason, requested_policy_id
  );
  if created_event.organization_id is distinct from target_org then raise exception 'FORBIDDEN'; end if;

  public_attestation := jsonb_build_object(
    'id', created_event.id,
    'action', created_event.action,
    'reason', created_event.reason,
    'rubric_version', created_event.rubric_version,
    'policy_id', created_event.policy_id,
    'previous_digest', created_event.previous_digest,
    'digest', created_event.digest,
    'sequence_no', created_event.sequence_no,
    'digest_version', created_event.digest_version,
    'created_at', created_event.created_at
  );
  response_body := jsonb_build_object(
    'success', true,
    'attestation', public_attestation,
    'workflow_state', requested_action,
    'policy', response_policy
  );
  perform public.complete_idempotency(
    target_org, requesting_actor, target_operation, target_key,
    target_fingerprint, 200, response_body
  );
  return response_body;
end;
$$;

revoke all on function public.persist_model_card_idempotently(uuid, uuid, text, uuid, text, jsonb, numeric, text) from public;
revoke all on function public.attest_model_card_idempotently(uuid, uuid, uuid, text, text, text, text, uuid, text, jsonb) from public;
grant execute on function public.persist_model_card_idempotently(uuid, uuid, text, uuid, text, jsonb, numeric, text) to service_role;
grant execute on function public.attest_model_card_idempotently(uuid, uuid, uuid, text, text, text, text, uuid, text, jsonb) to service_role;
