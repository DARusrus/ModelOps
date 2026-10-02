-- Replace the organization UUID before running in the disposable project.
-- These are shape validations only; authorization is covered by the RPC tests.

explain (analyze, buffers)
select
  count(*) as active_evaluations,
  count(*) filter (where workflow_state in ('submitted', 'under_review')) as review_required
from public.model_cards
where organization_id = '00000000-0000-0000-0000-000000000000'
  and expires_at > now();

explain (analyze, buffers)
select id, model_name, model_version, readiness_score, workflow_state, created_by, created_at
from public.model_cards
where organization_id = '00000000-0000-0000-0000-000000000000'
  and expires_at > now()
  and workflow_state in ('submitted', 'under_review')
order by created_at desc, id desc
limit 21;

explain (analyze, buffers)
select id, model_name, model_version, readiness_score, workflow_state, created_at
from public.model_cards
where organization_id = '00000000-0000-0000-0000-000000000000'
  and expires_at > now()
order by created_at desc, id desc
limit 5;
