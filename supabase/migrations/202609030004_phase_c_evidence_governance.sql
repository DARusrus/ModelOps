alter table public.model_cards add column if not exists rubric_version text not null default 'legacy';
alter table public.model_cards add column if not exists workflow_state text not null default 'draft' check (workflow_state in ('draft','submitted','under_review','approved','rejected','changes_requested'));
create table if not exists public.review_attestations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  model_card_id uuid not null references public.model_cards(id) on delete cascade,
  actor_id uuid not null references auth.users(id), action text not null check (action in ('submitted','under_review','approved','rejected','changes_requested')),
  reason text not null check (char_length(reason) between 1 and 2000), rubric_version text not null,
  evidence_snapshot jsonb not null, previous_digest text, digest text not null unique, created_at timestamptz not null default now(), expires_at timestamptz not null default now() + interval '7 years'
);
alter table public.review_attestations enable row level security;
create policy "members read attestations" on public.review_attestations for select to authenticated using (public.is_member(organization_id));
create policy "reviewers create attestations" on public.review_attestations for insert to authenticated with check (public.has_role(organization_id, array['reviewer','admin']::public.app_role[]) and actor_id = auth.uid());
revoke all on public.review_attestations from anon;
grant select, insert on public.review_attestations to authenticated;
create index if not exists review_attestations_card_created_idx on public.review_attestations (organization_id, model_card_id, created_at desc);
