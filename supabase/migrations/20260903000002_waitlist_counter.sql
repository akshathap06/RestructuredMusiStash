-- =========================================================================
-- Public waitlist counter for the sign-in screen.
--
-- The number shown = a configurable base (social-proof seed) + every real
-- waitlist_entries row. Every account auto-enrols via the on_auth_user_created
-- trigger, and the web "Creator Community" form writes a row with
-- source = 'creator_community', so both channels increment it for free.
-- =========================================================================

create table if not exists public.app_settings (
  key   text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
-- Read-only to the app; only service_role / migrations write.
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings
  for select using (true);

insert into public.app_settings (key, value)
values ('waitlist_base_count', '850'::jsonb)
on conflict (key) do nothing;

-- Widen rpc_waitlist_status to fold in the base. Still returns
-- { total, on_list } so the existing LiveWaitlistSheet keeps working.
create or replace function public.rpc_waitlist_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_base bigint;
begin
  select coalesce((value)::text::bigint, 0) into v_base
  from public.app_settings where key = 'waitlist_base_count';

  return json_build_object(
    'total', coalesce(v_base, 0) + (select count(*) from public.waitlist_entries),
    'base', coalesce(v_base, 0),
    'on_list', (v_uid is not null and exists (
      select 1 from public.waitlist_entries where user_id = v_uid
    ))
  );
end;
$$;

revoke all on function public.rpc_waitlist_status() from public;
grant execute on function public.rpc_waitlist_status() to anon, authenticated;

-- Make sure the Creator Community source is an accepted channel value if a
-- CHECK constraint exists on it (no-op otherwise).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='waitlist_entries' and column_name='platform'
  ) then
    -- platform CHECK from an earlier migration allows app|web|unknown; a
    -- creator-community signup is a 'web' signup, so nothing to change.
    null;
  end if;
end $$;
