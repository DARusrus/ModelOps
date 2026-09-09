-- Run this once in the Supabase SQL Editor AFTER migration
-- 202609040013_production_hardening.sql has succeeded.
-- This is intentionally not an application migration: pg_cron availability
-- and job ownership are deployment controls that must be confirmed per project.

do $retention_job$
declare
  existing_job_id bigint;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron is not enabled. Enable it in Supabase Integrations -> Cron, then rerun this file.';
  end if;

  select jobid into existing_job_id
  from cron.job
  where jobname = 'modelops-governance-retention-daily';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'modelops-governance-retention-daily',
    '17 3 * * *',
    $command$select public.purge_expired_governance_records();$command$
  );
end;
$retention_job$;

-- Verification: this must return exactly one active job with the stated name.
select jobid, jobname, schedule, active, command
from cron.job
where jobname = 'modelops-governance-retention-daily';

-- After the next scheduled execution, inspect its result without exposing
-- governed record content.
select jobid, status, start_time, end_time, return_message
from cron.job_run_details
where jobid = (
  select jobid from cron.job where jobname = 'modelops-governance-retention-daily'
)
order by start_time desc
limit 10;
