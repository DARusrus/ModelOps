-- Complete the approved 24-hour idempotency policy with an atomic claim/finalize workflow.
alter table public.idempotency_records alter column response_status drop not null;
alter table public.idempotency_records alter column response_body drop not null;
alter table public.idempotency_records add column if not exists request_fingerprint text;
alter table public.idempotency_records add column if not exists state text not null default 'processing' check (state in ('processing', 'completed'));

create or replace function public.claim_idempotency(target_org uuid, requesting_actor uuid, target_operation text, target_key uuid, fingerprint text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare existing public.idempotency_records%rowtype;
begin
  begin
    insert into public.idempotency_records(organization_id, actor_id, operation, idempotency_key, request_fingerprint)
    values(target_org, requesting_actor, target_operation, target_key, fingerprint);
    return jsonb_build_object('action', 'claimed');
  exception when unique_violation then null;
  end;
  select * into existing from public.idempotency_records where organization_id=target_org and actor_id=requesting_actor and operation=target_operation and idempotency_key=target_key for update;
  if existing.expires_at <= now() then
    delete from public.idempotency_records where organization_id=target_org and actor_id=requesting_actor and operation=target_operation and idempotency_key=target_key;
    insert into public.idempotency_records(organization_id, actor_id, operation, idempotency_key, request_fingerprint) values(target_org, requesting_actor, target_operation, target_key, fingerprint);
    return jsonb_build_object('action', 'claimed');
  end if;
  if existing.request_fingerprint <> fingerprint then return jsonb_build_object('action', 'conflict'); end if;
  if existing.state = 'completed' then return jsonb_build_object('action', 'replay', 'response_status', existing.response_status, 'response_body', existing.response_body); end if;
  return jsonb_build_object('action', 'in_progress');
end; $$;

create or replace function public.complete_idempotency(target_org uuid, requesting_actor uuid, target_operation text, target_key uuid, fingerprint text, status_code integer, body jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.idempotency_records set state='completed', response_status=status_code, response_body=body
  where organization_id=target_org and actor_id=requesting_actor and operation=target_operation and idempotency_key=target_key and request_fingerprint=fingerprint and state='processing';
  if not found then raise exception 'IDEMPOTENCY_RECORD_NOT_FOUND'; end if;
end; $$;

create or replace function public.abandon_idempotency(target_org uuid, requesting_actor uuid, target_operation text, target_key uuid, fingerprint text)
returns void language sql security definer set search_path = public as $$
  delete from public.idempotency_records where organization_id=target_org and actor_id=requesting_actor and operation=target_operation and idempotency_key=target_key and request_fingerprint=fingerprint and state='processing';
$$;
revoke all on function public.claim_idempotency(uuid,uuid,text,uuid,text), public.complete_idempotency(uuid,uuid,text,uuid,text,integer,jsonb), public.abandon_idempotency(uuid,uuid,text,uuid,text) from public;
grant execute on function public.claim_idempotency(uuid,uuid,text,uuid,text), public.complete_idempotency(uuid,uuid,text,uuid,text,integer,jsonb), public.abandon_idempotency(uuid,uuid,text,uuid,text) to service_role;
