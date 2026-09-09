-- Evidence has an independent expiry timestamp. A card can remain active while
-- one of its evidence records expires, so relying on the card delete cascade is
-- insufficient for the approved one-year evidence-retention policy.
create or replace function public.purge_expired_governance_records()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  deleted_cards integer;
  deleted_evidence integer;
  deleted_audit integer;
  deleted_attestations integer;
  deleted_idempotency integer;
begin
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
    'idempotency_records', deleted_idempotency
  );
end;
$$;

revoke all on function public.purge_expired_governance_records() from public;
grant execute on function public.purge_expired_governance_records() to service_role;
