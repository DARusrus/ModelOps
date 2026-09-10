-- Retire the client-callable review RPC superseded by the server-owned,
-- policy-bound, idempotent review route.

begin;

drop function if exists public.attest_model_card(uuid, text, text);

-- SECURITY DEFINER helpers used by RLS and application request controls should
-- be callable only by the role that needs them, not PostgreSQL's PUBLIC role.
revoke all on function public.is_member(uuid) from public, anon;
revoke all on function public.has_role(uuid, public.app_role[]) from public, anon;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon;

grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated;

commit;
