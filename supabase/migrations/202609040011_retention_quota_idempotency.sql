-- Approved policy: cards/evidence 1 year; audit events 7 years; AI 100/day, 2000/month; idempotency 24h.
create table if not exists public.ai_quota_usage (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  period_kind text not null check (period_kind in ('day','month')),
  used_count integer not null default 0 check (used_count >= 0),
  primary key (organization_id, period_start, period_kind)
);
create table if not exists public.idempotency_records (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  idempotency_key uuid not null,
  response_status integer not null,
  response_body jsonb not null,
  expires_at timestamptz not null default now() + interval '24 hours',
  created_at timestamptz not null default now(),
  primary key (organization_id, actor_id, operation, idempotency_key)
);
create index if not exists idempotency_records_expiry_idx on public.idempotency_records(expires_at);
revoke all on public.ai_quota_usage, public.idempotency_records from authenticated, anon;

create or replace function public.consume_ai_quota(target_org uuid, daily_limit integer, monthly_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare day_total integer; month_total integer;
begin
  insert into public.ai_quota_usage(organization_id, period_start, period_kind) values(target_org, current_date, 'day') on conflict do nothing;
  insert into public.ai_quota_usage(organization_id, period_start, period_kind) values(target_org, date_trunc('month', current_date)::date, 'month') on conflict do nothing;
  select used_count into day_total from public.ai_quota_usage where organization_id=target_org and period_start=current_date and period_kind='day' for update;
  select used_count into month_total from public.ai_quota_usage where organization_id=target_org and period_start=date_trunc('month', current_date)::date and period_kind='month' for update;
  if day_total >= daily_limit or month_total >= monthly_limit then return false; end if;
  update public.ai_quota_usage set used_count=used_count+1 where organization_id=target_org and period_start in (current_date, date_trunc('month', current_date)::date);
  return true;
end; $$;
revoke all on function public.consume_ai_quota(uuid, integer, integer) from public;
grant execute on function public.consume_ai_quota(uuid, integer, integer) to service_role;
