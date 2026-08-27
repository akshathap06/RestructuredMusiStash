-- Paper Mobile redesign / Phase 1 — waitlist wiring.
-- Columns the WaitlistEntry type carries but the table lacked, plus a
-- SECURITY DEFINER helper so hasJoined() can check an arbitrary email without a
-- permissive SELECT policy (waitlist_read_own only exposes the caller's row).

alter table public.waitlist_entries
  add column if not exists interested_real_money boolean not null default true,
  add column if not exists expected_amount        numeric,
  add column if not exists consent_at             timestamptz;

create or replace function public.rpc_waitlist_has_email(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.waitlist_entries
    where lower(email) = lower(trim(p_email))
  );
$$;

grant execute on function public.rpc_waitlist_has_email(text) to anon, authenticated;
