-- List projections and a seek index for the saved-evaluations endpoint.
-- Generated columns make the small list representation derive from the
-- canonical JSON payload, avoiding a second application-managed copy.

alter table public.model_cards
  add column if not exists model_name text generated always as (payload ->> 'model_name') stored,
  add column if not exists model_version text generated always as (payload ->> 'version') stored;

-- The query fixes organization first and walks newest records by a unique,
-- stable `(created_at, id)` key. Included values allow small list reads
-- without selecting the potentially large payload document.
create index if not exists model_cards_listing_cursor_idx
  on public.model_cards (organization_id, created_at desc, id desc)
  include (model_name, model_version, readiness_score, expires_at);
