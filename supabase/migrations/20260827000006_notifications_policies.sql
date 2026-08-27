-- Paper Mobile redesign / Phase 1 — notifications wiring.
-- The v2 restructure gave notifications only own-read + own-update policies.
-- Add own-insert (clients/RPCs create for the acting user) and own-delete
-- (the Notifications screen has a per-row delete control).

drop policy if exists notif_own_insert on public.notifications;
create policy notif_own_insert on public.notifications
  for insert with check (auth.uid() = user_id);

drop policy if exists notif_own_delete on public.notifications;
create policy notif_own_delete on public.notifications
  for delete using (auth.uid() = user_id);
