-- Read-only validation for Batch 6 catalog queries.
-- Run in the disposable project after representative model_cards data exists.
-- Inspect whether the organization/keyset index is used before adding any new index.

explain (analyze, buffers, format text)
select id, model_name, model_version, readiness_score, workflow_state, created_by, created_at, expires_at
from public.model_cards
where organization_id = (select organization_id from public.memberships limit 1)
  and expires_at > now()
order by created_at desc, id desc
limit 21;

explain (analyze, buffers, format text)
select id, model_name, model_version, readiness_score, workflow_state, created_by, created_at, expires_at
from public.model_cards
where organization_id = (select organization_id from public.memberships limit 1)
  and workflow_state = 'draft'
  and readiness_score between 0 and 100
  and expires_at > now()
order by created_at desc, id desc
limit 21;

explain (analyze, buffers, format text)
select id, model_name, model_version, readiness_score, workflow_state, created_by, created_at, expires_at
from public.model_cards
where organization_id = (select organization_id from public.memberships limit 1)
  and (model_name ilike '%model%' or model_version ilike '%model%')
  and expires_at > now()
order by created_at desc, id desc
limit 21;
