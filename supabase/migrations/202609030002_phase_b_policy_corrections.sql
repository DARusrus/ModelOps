-- Follow-up to the initial Phase B schema. Keep this as a separate migration:
-- the first migration may already be applied to a shared environment.

drop policy if exists "editors create cards" on public.model_cards;
create policy "editors create cards"
on public.model_cards for insert to authenticated
with check (
  public.has_role(organization_id, array['editor','reviewer','admin']::public.app_role[])
  and created_by = auth.uid()
);

drop policy if exists "members read cards" on public.model_cards;
create policy "members read unexpired cards"
on public.model_cards for select to authenticated
using (public.is_member(organization_id) and expires_at > now());

drop policy if exists "members read evidence" on public.evidence_items;
create policy "members read unexpired evidence"
on public.evidence_items for select to authenticated
using (public.is_member(organization_id) and expires_at > now());

drop policy if exists "members read audit" on public.audit_events;
create policy "members read unexpired audit"
on public.audit_events for select to authenticated
using (public.is_member(organization_id) and expires_at > now());

-- Physical deletion is intentionally not automated here. It requires a
-- separately provisioned scheduler/service credential and must be observable.
create index if not exists model_cards_organization_created_at_idx on public.model_cards (organization_id, created_at desc);
create index if not exists evidence_items_organization_created_at_idx on public.evidence_items (organization_id, created_at desc);
create index if not exists audit_events_organization_created_at_idx on public.audit_events (organization_id, created_at desc);
