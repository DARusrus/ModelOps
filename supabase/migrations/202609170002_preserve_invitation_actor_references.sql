-- Invitation actor identities are retained for the same governed-retention
-- period as the invitation record. Automatic auth-user deletion is not part of
-- the approved product policy, so the foreign key must agree with the terminal
-- state constraint instead of attempting an invalid SET NULL transition.

alter table public.organization_invitations
  drop constraint organization_invitations_accepted_by_fkey;

alter table public.organization_invitations
  add constraint organization_invitations_accepted_by_fkey
  foreign key (accepted_by) references auth.users(id) on delete restrict;
