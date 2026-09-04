-- =========================================================================
-- Security hardening pass for the paper-investing engine.
--
-- Three holes, all closed here:
--
-- 1. Every rpc_/fn_ function had EXECUTE granted to PUBLIC (Postgres default),
--    so `anon` could call them. Worse, the cron-only admin functions
--    (rpc_settle_project, rpc_expire_due_projects, rpc_reprice_all_projects,
--    rpc_snapshot_all_portfolios) had no caller check — any user could call
--    rpc_settle_project(<any id>, 'cancel') and force a 100% refund on a
--    project they don't own, bypassing rpc_cancel_project's ownership check.
--
-- 2. paper_wallets / paper_positions / paper_transactions had FOR ALL RLS
--    policies, so a user could `UPDATE paper_wallets SET balance = 1e9` or
--    INSERT a fabricated position straight through PostgREST, never touching
--    the RPCs. Money mutation now goes through the SECURITY DEFINER RPCs only;
--    the tables are read-own, write-none from the client.
--
-- 3. artist_projects owners could UPDATE their project's economic columns
--    (price, backing total, status, dates) directly, juicing their own paper
--    market. A trigger now rejects client-side changes to those columns.
--
-- Nothing here changes behaviour for a well-behaved client — the app already
-- goes through the RPCs.
-- =========================================================================

-- --- 1. function EXECUTE grants ------------------------------------------
-- Strip the blanket PUBLIC grant from everything, then hand back precisely.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname like 'rpc_%' or p.proname like 'fn_%' or p.proname = 'handle_new_user')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- Cron-only. The 08:00 job runs as postgres (function owner), and
-- rpc_cancel_project reaches rpc_settle_project as its definer, so neither
-- needs a role grant here.
grant execute on function
  public.rpc_settle_project(uuid, text),
  public.rpc_expire_due_projects(),
  public.rpc_reprice_all_projects(),
  public.rpc_snapshot_all_portfolios()
  to service_role;

-- Signed-in users: their own wallet + positions, and the read helpers the
-- app calls directly (reprice-on-load, project-history seeding on create).
grant execute on function
  public.rpc_ensure_paper_wallet(),
  public.rpc_reset_paper_account(),
  public.rpc_invest(uuid, numeric),
  public.rpc_open_paper_position(uuid, numeric),
  public.rpc_exit_position(uuid),
  public.rpc_cancel_project(uuid),
  public.rpc_snapshot_portfolio(),
  public.rpc_reprice_project(uuid),
  public.rpc_seed_project_history(uuid),
  public.fn_project_model_price(uuid, timestamptz),
  public.fn_project_scores(uuid),
  public.fn_scenario_price(uuid, numeric),
  public.fn_daily_noise(text, date)
  to authenticated;

-- Waitlist count is shown on the pre-auth Intro screen.
grant execute on function
  public.rpc_waitlist_status(),
  public.rpc_waitlist_has_email(text)
  to anon, authenticated;

-- --- 2. paper table RLS: read-own, write only through the RPCs ----------
alter table public.paper_wallets       enable row level security;
alter table public.paper_positions     enable row level security;
alter table public.paper_transactions  enable row level security;

drop policy if exists wallet_own      on public.paper_wallets;
drop policy if exists positions_own   on public.paper_positions;
drop policy if exists tx_own          on public.paper_transactions;

create policy wallet_read_own on public.paper_wallets
  for select using (auth.uid() = user_id);
create policy positions_read_own on public.paper_positions
  for select using (auth.uid() = user_id);
create policy tx_read_own on public.paper_transactions
  for select using (auth.uid() = user_id);
-- No INSERT/UPDATE/DELETE policies: PostgREST writes are refused, the
-- SECURITY DEFINER RPCs (which bypass RLS) remain the only writers.

-- --- 3. waitlist: drop the open INSERT policy --------------------------
-- handle_new_user() (SECURITY DEFINER) is the only legitimate writer; a
-- world-writable table would let anyone pad the public counter.
drop policy if exists waitlist_insert_any on public.waitlist_entries;

-- --- 4. artist_projects: freeze economic columns from client edits -----
create or replace function public.guard_project_economics()
returns trigger
language plpgsql
as $$
begin
  -- SECURITY DEFINER RPCs execute as the table owner (postgres via current_user),
  -- so only direct PostgREST edits by a normal role are blocked.
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if new.current_paper_share_price is distinct from old.current_paper_share_price
     or new.paper_backing_total   is distinct from old.paper_backing_total
     or new.paper_backer_count    is distinct from old.paper_backer_count
     or new.total_units           is distinct from old.total_units
     or new.status                is distinct from old.status
     or new.initial_price         is distinct from old.initial_price
     or new.settlement_price      is distinct from old.settlement_price
     or new.funding_goal          is distinct from old.funding_goal
     or new.funding_deadline      is distinct from old.funding_deadline
     or new.maturity_date         is distinct from old.maturity_date
     or new.funded_at             is distinct from old.funded_at
  then
    raise exception 'Project economics are managed by the paper-investing engine'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_project_economics on public.artist_projects;
create trigger trg_guard_project_economics
  before update on public.artist_projects
  for each row execute function public.guard_project_economics();
