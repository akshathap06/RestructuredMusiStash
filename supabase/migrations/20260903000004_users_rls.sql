-- =========================================================================
-- public.users had RLS ENABLED with ZERO policies.
--
-- In Postgres that is deny-all: no client could read or write any row, so
-- every sign-in fell into authService's "profile missing -> create it" branch
-- and failed with 42501 ("Failed to create user profile"). It is also why the
-- app fell back to "Unknown User" / missing avatars throughout.
--
-- Fix: own-row access on the base table, plus a narrow view for the one thing
-- other people legitimately need — a display name and avatar. Email and phone
-- stay private to the owner; opening the whole table to `authenticated` would
-- have let any signed-in user harvest every address.
-- =========================================================================

alter table public.users enable row level security;

drop policy if exists users_select_own on public.users;
drop policy if exists users_insert_own on public.users;
drop policy if exists users_update_own on public.users;

-- A user reads and maintains their own row. Signup still works because the
-- id must equal the caller's uid.
create policy users_select_own on public.users
  for select using (auth.uid() = id);

create policy users_insert_own on public.users
  for insert with check (auth.uid() = id);

create policy users_update_own on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- No delete policy: account removal goes through the delete-account edge
-- function, which runs as service_role.

-- --- public display profiles ------------------------------------------
-- Name + avatar only. security_invoker stays off so the view reads past RLS,
-- which is the point: it is the sanctioned window onto other people's rows.
drop view if exists public.public_profiles;
create view public.public_profiles as
  select id, name, avatar from public.users;

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

comment on view public.public_profiles is
  'Display-safe projection of public.users (id, name, avatar). Use this for any cross-user read; the base table is own-row only so email/phone stay private.';
