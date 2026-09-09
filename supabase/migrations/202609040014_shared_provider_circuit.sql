-- Deployment-wide AI provider circuit state. Apply after production hardening.
-- Provider health is global because an upstream provider outage affects every
-- organization; no client role may read or mutate this operational state.

create table if not exists public.provider_circuit_states (
  provider text primary key check (provider in ('groq', 'gemini')),
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  open_until timestamptz,
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.provider_circuit_states enable row level security;
revoke all on public.provider_circuit_states from anon, authenticated;

create or replace function public.provider_circuit_available(target_provider text)
returns boolean language plpgsql security definer set search_path = public as $$
declare state public.provider_circuit_states%rowtype;
begin
  if target_provider not in ('groq', 'gemini') then raise exception 'INVALID_PROVIDER'; end if;
  select * into state from public.provider_circuit_states where provider = target_provider for update;
  if not found then return true; end if;
  if state.open_until is not null and state.open_until > clock_timestamp() then return false; end if;
  -- A completed cool-down is the controlled probe window. Reset before the
  -- probe so one renewed failure does not immediately reopen the circuit.
  if state.open_until is not null then
    update public.provider_circuit_states
    set consecutive_failures = 0, open_until = null, updated_at = clock_timestamp()
    where provider = target_provider;
  end if;
  return true;
end;
$$;

create or replace function public.record_provider_circuit_failure(
  target_provider text,
  failure_threshold integer default 3,
  cooldown_seconds integer default 30
)
returns void language plpgsql security definer set search_path = public as $$
declare next_failures integer;
begin
  if target_provider not in ('groq', 'gemini') then raise exception 'INVALID_PROVIDER'; end if;
  if failure_threshold < 1 or cooldown_seconds < 1 then raise exception 'INVALID_CIRCUIT_CONFIGURATION'; end if;
  insert into public.provider_circuit_states(provider, consecutive_failures, open_until, updated_at)
  values (target_provider, 1, null, clock_timestamp())
  on conflict (provider) do update
  set consecutive_failures = public.provider_circuit_states.consecutive_failures + 1,
      updated_at = clock_timestamp()
  returning consecutive_failures into next_failures;
  if next_failures >= failure_threshold then
    update public.provider_circuit_states
    set open_until = clock_timestamp() + make_interval(secs => cooldown_seconds), updated_at = clock_timestamp()
    where provider = target_provider;
  end if;
end;
$$;

create or replace function public.record_provider_circuit_success(target_provider text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if target_provider not in ('groq', 'gemini') then raise exception 'INVALID_PROVIDER'; end if;
  delete from public.provider_circuit_states where provider = target_provider;
end;
$$;

revoke all on function public.provider_circuit_available(text), public.record_provider_circuit_failure(text, integer, integer), public.record_provider_circuit_success(text) from public;
grant execute on function public.provider_circuit_available(text), public.record_provider_circuit_failure(text, integer, integer), public.record_provider_circuit_success(text) to service_role;
