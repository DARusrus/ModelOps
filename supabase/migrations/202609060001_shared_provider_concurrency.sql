-- Shared provider bulkhead. A short-lived lease protects external AI capacity
-- across all serverless instances; deterministic evaluation remains independent.
create table if not exists app_private.provider_concurrency_leases (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('groq', 'gemini')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists provider_concurrency_leases_expiry_idx
  on app_private.provider_concurrency_leases (provider, expires_at);

create or replace function public.acquire_provider_concurrency_lease(
  target_provider text,
  max_concurrent integer,
  lease_seconds integer
)
returns uuid
language plpgsql
security definer
set search_path = app_private, public
as $$
declare lease_id uuid;
begin
  if target_provider not in ('groq', 'gemini') then raise exception 'INVALID_PROVIDER'; end if;
  if max_concurrent < 1 or max_concurrent > 64 then raise exception 'INVALID_CONCURRENCY_LIMIT'; end if;
  if lease_seconds < 1 or lease_seconds > 120 then raise exception 'INVALID_LEASE_DURATION'; end if;

  -- Serialize only admission decisions for this provider. Calls themselves run
  -- outside the transaction, bounded by their own request timeout.
  perform pg_advisory_xact_lock(hashtext('modelops:provider-concurrency:' || target_provider));
  delete from app_private.provider_concurrency_leases
  where provider = target_provider and expires_at <= now();
  if (select count(*) from app_private.provider_concurrency_leases where provider = target_provider) >= max_concurrent then
    return null;
  end if;
  insert into app_private.provider_concurrency_leases(provider, expires_at)
  values (target_provider, now() + make_interval(secs => lease_seconds))
  returning id into lease_id;
  return lease_id;
end;
$$;

create or replace function public.release_provider_concurrency_lease(target_lease uuid)
returns void
language sql
security definer
set search_path = app_private, public
as $$
  delete from app_private.provider_concurrency_leases where id = target_lease;
$$;

revoke all on app_private.provider_concurrency_leases from public, anon, authenticated;
revoke all on function public.acquire_provider_concurrency_lease(text, integer, integer), public.release_provider_concurrency_lease(uuid) from public;
grant execute on function public.acquire_provider_concurrency_lease(text, integer, integer), public.release_provider_concurrency_lease(uuid) to service_role;
