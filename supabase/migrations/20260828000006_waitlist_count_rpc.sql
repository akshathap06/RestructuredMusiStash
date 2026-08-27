-- MusiStash Paper-Investing Engine / step 6 — waitlist status for the LIVE pill.
-- waitlist_entries RLS only exposes the caller's own row, so a total count needs
-- a SECURITY DEFINER helper. Returns { on_list, total }.

create or replace function public.rpc_waitlist_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  return json_build_object(
    'total', (select count(*) from public.waitlist_entries),
    'on_list', (v_uid is not null and exists (
      select 1 from public.waitlist_entries where user_id = v_uid
    ))
  );
end;
$$;

grant execute on function public.rpc_waitlist_status() to anon, authenticated;
