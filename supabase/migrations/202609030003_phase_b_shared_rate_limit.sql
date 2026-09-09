create schema if not exists app_private;
create table if not exists app_private.rate_limit_buckets (
  user_id uuid not null references auth.users(id) on delete cascade,
  route text not null check (char_length(route) between 1 and 80),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, route)
);

create or replace function public.consume_rate_limit(p_route text, p_max_requests integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = app_private, public
as $$
declare
  actor_id uuid := auth.uid();
  bucket app_private.rate_limit_buckets%rowtype;
begin
  if actor_id is null then raise exception 'authentication required'; end if;
  if p_max_requests < 1 or p_max_requests > 1000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit configuration';
  end if;
  select * into bucket from app_private.rate_limit_buckets where user_id = actor_id and route = p_route for update;
  if not found then
    insert into app_private.rate_limit_buckets(user_id, route, request_count) values (actor_id, p_route, 1);
    return true;
  end if;
  if bucket.window_started_at + make_interval(secs => p_window_seconds) <= now() then
    update app_private.rate_limit_buckets set window_started_at = now(), request_count = 1 where user_id = actor_id and route = p_route;
    return true;
  end if;
  if bucket.request_count >= p_max_requests then return false; end if;
  update app_private.rate_limit_buckets set request_count = request_count + 1 where user_id = actor_id and route = p_route;
  return true;
end;
$$;

revoke all on schema app_private from public;
revoke all on all tables in schema app_private from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated;
