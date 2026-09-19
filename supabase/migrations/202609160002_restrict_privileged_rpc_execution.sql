-- Supabase projects may grant EXECUTE on newly created public functions
-- directly to anon and authenticated. Revoking PUBLIC alone does not remove
-- those role-specific grants, so privileged RPCs must deny both roles.

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

revoke execute on function public.abandon_idempotency(uuid, uuid, text, uuid, text) from anon, authenticated;
revoke execute on function public.acquire_provider_concurrency_lease(text, integer, integer) from anon, authenticated;
revoke execute on function public.attest_model_card_as(uuid, uuid, text, text, text) from anon, authenticated;
revoke execute on function public.attest_model_card_idempotently(uuid, uuid, uuid, text, text, text, text, uuid, text, jsonb) from anon, authenticated;
revoke execute on function public.change_organization_member_role_as(uuid, uuid, uuid, public.app_role) from anon, authenticated;
revoke execute on function public.claim_idempotency(uuid, uuid, text, uuid, text) from anon, authenticated;
revoke execute on function public.complete_idempotency(uuid, uuid, text, uuid, text, integer, jsonb) from anon, authenticated;
revoke execute on function public.consume_ai_quota(uuid, integer, integer) from anon, authenticated;
revoke execute on function public.create_organization_invitation_as(uuid, uuid, text, public.app_role) from anon, authenticated;
revoke execute on function public.list_organization_members_as(uuid, uuid) from anon, authenticated;
revoke execute on function public.persist_model_card_evidence() from anon, authenticated;
revoke execute on function public.persist_model_card_idempotently(uuid, uuid, text, uuid, text, jsonb, numeric, text) from anon, authenticated;
revoke execute on function public.provider_circuit_available(text) from anon, authenticated;
revoke execute on function public.purge_expired_governance_records() from anon, authenticated;
revoke execute on function public.record_provider_circuit_failure(text, integer, integer) from anon, authenticated;
revoke execute on function public.record_provider_circuit_success(text) from anon, authenticated;
revoke execute on function public.release_ai_quota(uuid) from anon, authenticated;
revoke execute on function public.release_provider_concurrency_lease(uuid) from anon, authenticated;
revoke execute on function public.remove_organization_member_as(uuid, uuid, uuid) from anon, authenticated;
revoke execute on function public.renew_organization_invitation_as(uuid, uuid) from anon, authenticated;
revoke execute on function public.revoke_organization_invitation_as(uuid, uuid) from anon, authenticated;

-- These RPCs deliberately derive identity from the authenticated JWT. Keep
-- authenticated access explicit while preventing unauthenticated invocation.
revoke execute on function public.accept_organization_invitation(uuid) from anon;
revoke execute on function public.consume_rate_limit(text, integer, integer) from anon;
revoke execute on function public.create_initial_workspace(text) from anon;
revoke execute on function public.has_role(uuid, public.app_role[]) from anon;
revoke execute on function public.is_member(uuid) from anon;
revoke execute on function public.verify_model_card_attestations(uuid) from anon;

grant execute on function public.accept_organization_invitation(uuid) to authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated;
grant execute on function public.create_initial_workspace(text) to authenticated;
grant execute on function public.has_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.verify_model_card_attestations(uuid) to authenticated;
