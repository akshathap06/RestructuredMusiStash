-- =========================================================================
-- Create the public.users profile row from a trigger instead of the client.
--
-- Every sign-up path (email/password, Google, Apple) had the app INSERT the
-- profile itself right after signUp. With own-row RLS that only works when a
-- session already exists — and on email sign-up with confirmation enabled it
-- does not, so the insert would be refused and the user would be left with an
-- auth account but no profile ("Account created but profile setup failed").
--
-- handle_new_user already runs on auth.users insert for the waitlist; extend
-- it to seed the profile in the same transaction. It is SECURITY DEFINER, so
-- it is not subject to RLS and does not care about session timing.
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1. Profile row. Never overwrite an existing one.
  begin
    insert into public.users (id, name, email, phone, role, avatar)
    values (
      new.id,
      coalesce(
        nullif(trim(new.raw_user_meta_data->>'name'), ''),
        nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
        split_part(coalesce(new.email, 'user'), '@', 1)
      ),
      coalesce(new.email, ''),
      nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''),
      coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'listener'),
      nullif(trim(coalesce(new.raw_user_meta_data->>'avatar_url', '')), '')
    )
    on conflict (id) do nothing;
    -- A duplicate email raises 23505; the handler below swallows it so the
    -- sign-up still completes and the user simply keeps their earlier profile.
  exception when others then
    -- Never block sign-up on profile creation.
    null;
  end;

  -- 2. Waitlist auto-enrolment (unchanged).
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
  exception when others then
    null;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any existing account that never got one.
-- users.email is UNIQUE, and a few auth accounts share an address with an
-- existing profile row under a different id (duplicate sign-ups). Those are
-- skipped rather than merged — picking a winner is a product decision, and
-- guessing would silently repoint someone's data.
insert into public.users (id, name, email, role)
select u.id,
       coalesce(nullif(trim(u.raw_user_meta_data->>'name'), ''),
                split_part(coalesce(u.email, 'user'), '@', 1)),
       coalesce(u.email, ''),
       'listener'
from auth.users u
left join public.users p on p.id = u.id
where p.id is null
  and coalesce(u.email, '') <> ''
  and not exists (
    select 1 from public.users e where lower(e.email) = lower(u.email)
  )
on conflict (id) do nothing;
