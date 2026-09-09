-- A newly created card has no attestation rows yet. Authorize integrity
-- verification through the live card in that case; after card retention
-- removes it, retain the existing attestation-based authorization path.
create or replace function public.verify_model_card_attestations(target_card uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  card_org uuid;
  event record;
  prior_digest text;
  expected_digest text;
  expected_sequence integer := 1;
begin
  select organization_id into card_org
  from public.model_cards
  where id = target_card and expires_at > now();

  if card_org is null then
    select organization_id into card_org
    from public.review_attestations
    where model_card_reference = target_card
    order by sequence_no desc
    limit 1;
  end if;

  if card_org is null or not public.is_member(card_org) then
    raise exception 'FORBIDDEN';
  end if;

  for event in
    select * from public.review_attestations
    where model_card_reference = target_card
    order by sequence_no
  loop
    if event.digest_version <> 'v2' then
      return jsonb_build_object('valid', null, 'checked_events', expected_sequence - 1, 'reason', 'LEGACY_UNVERIFIABLE');
    end if;
    if event.sequence_no <> expected_sequence or event.previous_digest is distinct from prior_digest then
      return jsonb_build_object('valid', false, 'checked_events', expected_sequence - 1, 'reason', 'SEQUENCE_OR_LINK_MISMATCH');
    end if;
    expected_digest := encode(extensions.digest(convert_to(jsonb_build_object(
      'action', event.action,
      'actor_id', event.actor_id,
      'card_id', event.model_card_reference,
      'evidence_snapshot', event.evidence_snapshot,
      'occurred_at', event.created_at,
      'policy_id', event.policy_id,
      'previous_digest', event.previous_digest,
      'reason', event.reason,
      'rubric_version', event.rubric_version,
      'sequence_no', event.sequence_no
    )::text, 'utf8'), 'sha256'), 'hex');
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
