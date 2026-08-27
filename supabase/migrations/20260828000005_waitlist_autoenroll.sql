-- MusiStash Paper-Investing Engine / step 5 — waitlist auto-enrolment.
-- The standalone Waitlist screen is removed: every registered account is
-- automatically on the waitlist. This trigger records app + web signups with
-- their channel; a backfill covers everyone who already exists.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.waitlist_entries (user_id, email, role, source, platform, auto_enrolled)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'role', 'fan'),
    coalesce(new.raw_user_meta_data->>'signup_source', 'app_signup'),
    coalesce(new.raw_user_meta_data->>'platform', 'unknown'),
    true
  )
  on conflict (email) do nothing;
  return new;
exception
  when others then
    -- Never block signup on a waitlist write.
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing accounts.
insert into public.waitlist_entries (user_id, email, role, source, platform, auto_enrolled)
select u.id, coalesce(u.email, ''), 'fan', 'backfill', 'unknown', true
from auth.users u
where coalesce(u.email, '') <> ''
on conflict (email) do nothing;

-- Admin visibility (service_role only).
create or replace view public.waitlist_overview as
  select platform, source, role,
         count(*) as entries,
         count(*) filter (where auto_enrolled) as auto_enrolled,
         min(created_at) as first_at,
         max(created_at) as last_at
  from public.waitlist_entries
  group by platform, source, role;

revoke all on public.waitlist_overview from anon, authenticated;
grant select on public.waitlist_overview to service_role;
