-- MusiStash Paper-Investing Engine / step 3 — invest / early-exit / settlement.
-- All money-mutating logic is SECURITY DEFINER + deterministic + idempotent.
-- Project state transitions happen ONLY inside these functions.

-- ---------------------------------------------------------------------------
-- Internal: write one portfolio snapshot for a user (cash + mark-to-market).
-- ---------------------------------------------------------------------------
create or replace function public._snapshot_user(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_cash numeric; v_invested numeric;
begin
  select balance into v_cash from public.paper_wallets where user_id = p_uid;
  if v_cash is null then return; end if;
  select coalesce(sum(pp.shares * ap.current_paper_share_price), 0)
    into v_invested
  from public.paper_positions pp
  join public.artist_projects ap on ap.id = pp.project_id
  where pp.user_id = p_uid and pp.status = 'open';
  insert into public.paper_portfolio_snapshots (user_id, value, cash, invested_value)
  values (p_uid, v_cash + coalesce(v_invested, 0), v_cash, coalesce(v_invested, 0));
end;
$$;

-- ---------------------------------------------------------------------------
-- rpc_ensure_paper_wallet / rpc_reset_paper_account / rpc_snapshot_portfolio
-- refreshed to the new transaction vocabulary + snapshot columns.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_ensure_paper_wallet()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_rows integer;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  insert into public.paper_wallets (user_id) values (v_uid)
  on conflict (user_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    insert into public.paper_transactions (user_id, type, amount, balance_after)
    values (v_uid, 'PAPER_CASH_INITIALIZED', 10000, 10000);
  end if;
  return (select row_to_json(w) from public.paper_wallets w where w.user_id = v_uid);
end;
$$;

create or replace function public.rpc_reset_paper_account()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  delete from public.paper_positions    where user_id = v_uid;
  delete from public.paper_transactions where user_id = v_uid;
  insert into public.paper_wallets (user_id, balance) values (v_uid, 10000)
  on conflict (user_id) do update set balance = 10000, updated_at = now();
  insert into public.paper_transactions (user_id, type, amount, balance_after)
  values (v_uid, 'PAPER_CASH_INITIALIZED', 10000, 10000);
  perform public._snapshot_user(v_uid);
  return (select row_to_json(w) from public.paper_wallets w where w.user_id = v_uid);
end;
$$;

create or replace function public.rpc_snapshot_portfolio()
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_total numeric;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  insert into public.paper_wallets (user_id) values (v_uid) on conflict (user_id) do nothing;
  perform public._snapshot_user(v_uid);
  select value into v_total from public.paper_portfolio_snapshots
  where user_id = v_uid order by recorded_at desc limit 1;
  return coalesce(v_total, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- rpc_invest: back a project with MusiStash Cash at the live model price.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_invest(p_project_id uuid, p_amount numeric)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid           uuid := auth.uid();
  proj            record;
  v_balance       numeric;
  v_new_balance   numeric;
  v_price         numeric;
  v_units         numeric;
  v_is_new_backer boolean;
  v_position      public.paper_positions%rowtype;
  v_tx            public.paper_transactions%rowtype;
  v_new_total     numeric;
  v_artist_uid    uuid;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero' using errcode = '22023';
  end if;

  select * into proj from public.artist_projects where id = p_project_id for update;
  if not found then raise exception 'Project not found' using errcode = 'P0002'; end if;
  if proj.status not in ('funding','funded','active') then
    raise exception 'Project is not open for backing (%).', proj.status using errcode = 'P0001';
  end if;

  insert into public.paper_wallets (user_id) values (v_uid) on conflict (user_id) do nothing;
  select balance into v_balance from public.paper_wallets where user_id = v_uid for update;
  if v_balance < p_amount then
    raise exception 'Insufficient MusiStash Cash' using errcode = 'P0001';
  end if;

  v_price       := greatest(coalesce(proj.current_paper_share_price, proj.initial_price, 10), 0.01);
  v_units       := p_amount / v_price;
  v_new_balance := v_balance - p_amount;

  update public.paper_wallets set balance = v_new_balance, updated_at = now() where user_id = v_uid;

  select (count(*) = 0) into v_is_new_backer
  from public.paper_positions where user_id = v_uid and project_id = p_project_id;

  insert into public.paper_positions (user_id, project_id, amount, shares, entry_share_price, status)
  values (v_uid, p_project_id, p_amount, v_units, v_price, 'open')
  on conflict (user_id, project_id) do update
    set amount            = public.paper_positions.amount + excluded.amount,
        shares            = public.paper_positions.shares + excluded.shares,
        entry_share_price = (public.paper_positions.amount + excluded.amount)
                            / nullif(public.paper_positions.shares + excluded.shares, 0),
        status            = 'open'
  returning * into v_position;

  update public.artist_projects
     set paper_backing_total = paper_backing_total + p_amount,
         paper_backer_count  = paper_backer_count + (case when v_is_new_backer then 1 else 0 end),
         total_units         = total_units + v_units,
         updated_at          = now()
   where id = p_project_id
  returning paper_backing_total into v_new_total;

  -- Funding transition: goal reached while still in 'funding'.
  if proj.status = 'funding' and v_new_total >= proj.funding_goal then
    update public.artist_projects
       set status = 'active',
           funded_at = now(),
           maturity_date = now() + (coalesce(proj.term_weeks, 12) || ' weeks')::interval
     where id = p_project_id;
    select pr.user_id into v_artist_uid
    from public.artist_profiles pr where pr.id = proj.artist_profile_id;
    if v_artist_uid is not null then
      insert into public.notifications (user_id, type, title, body, data)
      values (v_artist_uid, 'project_funded', 'Your project is funded',
              coalesce(proj.title,'Your project') || ' reached its funding goal.',
              jsonb_build_object('project_id', p_project_id));
    end if;
  end if;

  insert into public.paper_transactions (user_id, project_id, type, amount, units, price, balance_after)
  values (v_uid, p_project_id, 'INVEST', -p_amount, v_units, v_price, v_new_balance)
  returning * into v_tx;

  insert into public.project_valuations (project_id, value, source)
  values (p_project_id, v_price, 'trade');

  perform public._snapshot_user(v_uid);

  insert into public.notifications (user_id, type, title, body, data)
  values (v_uid, 'invest_completed', 'Position opened',
          'You backed ' || coalesce(proj.title,'a project') || ' with $'
            || trim(to_char(p_amount,'FM999999990.00')) || ' — '
            || trim(to_char(v_units,'FM999990.00')) || ' units @ $'
            || trim(to_char(v_price,'FM999990.0000')),
          jsonb_build_object('project_id', p_project_id, 'amount', p_amount,
                             'units', v_units, 'price', v_price));

  insert into public.paper_events (user_id, event, props)
  values (v_uid, 'invest_completed',
          jsonb_build_object('project_id', p_project_id, 'amount', p_amount,
                             'units', v_units, 'price', v_price));

  return json_build_object(
    'wallet',      (select row_to_json(w) from public.paper_wallets w where w.user_id = v_uid),
    'position',    row_to_json(v_position),
    'transaction', row_to_json(v_tx)
  );
end;
$$;

-- Back-compat alias for the previous name (client still calls this until updated).
create or replace function public.rpc_open_paper_position(p_project_id uuid, p_amount numeric)
returns json
language sql
security definer
set search_path = public
as $$ select public.rpc_invest(p_project_id, p_amount); $$;

-- ---------------------------------------------------------------------------
-- rpc_exit_position: sell an open position early at current model price − 2%.
-- Simplified simulated-liquidity mechanism (can be gated / replaced later).
-- ---------------------------------------------------------------------------
create or replace function public.rpc_exit_position(p_project_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  pos         public.paper_positions%rowtype;
  proj        record;
  v_price     numeric;
  v_exit      numeric;
  v_proceeds  numeric;
  v_realized  numeric;
  v_balance   numeric;
  v_tx        public.paper_transactions%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;

  select * into pos from public.paper_positions
  where user_id = v_uid and project_id = p_project_id and status = 'open'
  for update;
  if not found then raise exception 'No open position to exit' using errcode = 'P0002'; end if;

  select * into proj from public.artist_projects where id = p_project_id for update;

  v_price    := greatest(coalesce(proj.current_paper_share_price, proj.initial_price, 10), 0.01);
  v_exit     := round(v_price * 0.98, 4);
  v_proceeds := round(pos.shares * v_exit, 2);
  v_realized := round(v_proceeds - pos.amount, 2);

  update public.paper_positions
     set status = 'closed', proceeds = v_proceeds, realized_pnl = v_realized,
         exit_price = v_exit, closed_at = now()
   where id = pos.id;

  update public.paper_wallets set balance = balance + v_proceeds, updated_at = now()
   where user_id = v_uid
  returning balance into v_balance;

  -- Pre-funding withdrawal reduces the campaign; a secondary sale on a funded
  -- project does not.
  if proj.status = 'funding' then
    update public.artist_projects
       set paper_backing_total = greatest(paper_backing_total - pos.amount, 0),
           paper_backer_count  = greatest(paper_backer_count - 1, 0),
           total_units         = greatest(total_units - pos.shares, 0),
           updated_at          = now()
     where id = p_project_id;
  end if;

  insert into public.paper_transactions (user_id, project_id, type, amount, units, price, balance_after)
  values (v_uid, p_project_id, 'SELL', v_proceeds, pos.shares, v_exit, v_balance)
  returning * into v_tx;

  perform public._snapshot_user(v_uid);

  insert into public.notifications (user_id, type, title, body, data)
  values (v_uid, 'position_sold', 'Position closed',
          'You exited ' || coalesce(proj.title,'a project') || ' for $'
            || trim(to_char(v_proceeds,'FM999999990.00')) || ' ('
            || case when v_realized >= 0 then '+' else '' end
            || trim(to_char(v_realized,'FM999999990.00')) || ')',
          jsonb_build_object('project_id', p_project_id, 'proceeds', v_proceeds,
                             'realized_pnl', v_realized));

  insert into public.paper_events (user_id, event, props)
  values (v_uid, 'position_sold',
          jsonb_build_object('project_id', p_project_id, 'proceeds', v_proceeds,
                             'realized_pnl', v_realized, 'exit_price', v_exit));

  return json_build_object(
    'wallet',      (select row_to_json(w) from public.paper_wallets w where w.user_id = v_uid),
    'position',    (select row_to_json(x) from public.paper_positions x where x.id = pos.id),
    'transaction', row_to_json(v_tx)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- rpc_settle_project: deterministic + idempotent settlement engine.
--   funded + matured  -> settle every open position at the final model price
--   funding + past deadline + under goal -> 90% refund
--   p_reason='cancel' -> 100% refund
-- Re-running is a no-op once the project is terminal.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_settle_project(p_project_id uuid, p_reason text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  proj         record;
  v_branch     text;
  v_refund     numeric;      -- refund rate (null for matured)
  v_settle_px  numeric;      -- settlement price (null for refunds)
  v_tx_type    text;
  v_outcome    text;
  v_status     text;
  v_ref        uuid := gen_random_uuid();
  pos          record;
  v_proceeds   numeric;
  v_realized   numeric;
  v_unit_px    numeric;
  v_balance    numeric;
  v_count      int := 0;
  v_paid       numeric := 0;
begin
  select * into proj from public.artist_projects where id = p_project_id for update;
  if not found then raise exception 'Project not found' using errcode = 'P0002'; end if;

  if proj.status in ('completed','failed','cancelled') then
    return json_build_object('already_settled', true, 'status', proj.status);
  end if;

  if p_reason = 'cancel' then
    v_branch := 'cancel'; v_refund := 1.0; v_tx_type := 'PROJECT_CANCELLATION_REFUND';
    v_outcome := 'cancelled_refund'; v_status := 'cancelled';
  elsif proj.status = 'funding'
        and proj.funding_deadline is not null and proj.funding_deadline < now()
        and coalesce(proj.paper_backing_total,0) < proj.funding_goal then
    v_branch := 'failed'; v_refund := 0.9; v_tx_type := 'FAILED_PROJECT_REFUND';
    v_outcome := 'failed_refund'; v_status := 'failed';
  elsif proj.status = 'active'
        and proj.maturity_date is not null and proj.maturity_date < now() then
    v_branch := 'matured';
    v_settle_px := public.fn_project_model_price(p_project_id, proj.maturity_date);
    v_tx_type := 'PROJECT_SETTLEMENT'; v_outcome := 'funded_settled'; v_status := 'completed';
  else
    raise exception 'Project not eligible for settlement (status %, reason %)', proj.status, p_reason
      using errcode = 'P0001';
  end if;

  for pos in
    select * from public.paper_positions
    where project_id = p_project_id and status = 'open'
    for update
  loop
    if v_branch = 'matured' then
      v_proceeds := round(pos.shares * v_settle_px, 2);
      v_unit_px  := v_settle_px;
      update public.paper_positions
         set status='settled', proceeds=v_proceeds, realized_pnl=round(v_proceeds - pos.amount,2),
             exit_price=v_settle_px, closed_at=now(), settlement_ref=v_ref
       where id = pos.id;
    else
      v_proceeds := round(pos.amount * v_refund, 2);
      v_unit_px  := round(v_proceeds / nullif(pos.shares,0), 4);
      update public.paper_positions
         set status='refunded', proceeds=v_proceeds, realized_pnl=round(v_proceeds - pos.amount,2),
             exit_price=v_unit_px, closed_at=now(), settlement_ref=v_ref
       where id = pos.id;
    end if;

    v_realized := round(v_proceeds - pos.amount, 2);

    update public.paper_wallets set balance = balance + v_proceeds, updated_at = now()
     where user_id = pos.user_id
    returning balance into v_balance;

    insert into public.paper_transactions (user_id, project_id, type, amount, units, price, balance_after)
    values (pos.user_id, p_project_id, v_tx_type, v_proceeds, pos.shares, v_unit_px, v_balance);

    insert into public.notifications (user_id, type, title, body, data)
    values (pos.user_id,
            case v_branch when 'matured' then 'project_settled'
                          when 'failed'  then 'project_failed'
                          else 'project_settled' end,
            case v_branch when 'matured' then 'Project settled'
                          when 'failed'  then 'Project did not fund'
                          else 'Project cancelled' end,
            coalesce(proj.title,'A project') || ' — $'
              || trim(to_char(v_proceeds,'FM999999990.00')) || ' returned ('
              || case when v_realized >= 0 then '+' else '' end
              || trim(to_char(v_realized,'FM999999990.00')) || ')',
            jsonb_build_object('project_id', p_project_id, 'branch', v_branch,
                               'proceeds', v_proceeds, 'realized_pnl', v_realized));

    perform public._snapshot_user(pos.user_id);

    insert into public.paper_events (user_id, event, props)
    values (pos.user_id, 'project_' || v_branch,
            jsonb_build_object('project_id', p_project_id, 'proceeds', v_proceeds,
                               'realized_pnl', v_realized));

    v_count := v_count + 1;
    v_paid  := v_paid + v_proceeds;
  end loop;

  update public.artist_projects
     set status = v_status,
         settlement_price = v_settle_px,
         outcome = v_outcome,
         completed_at = case when v_branch = 'matured' then now() else completed_at end,
         failed_at    = case when v_branch = 'failed'  then now() else failed_at end,
         cancelled_at = case when v_branch = 'cancel'  then now() else cancelled_at end,
         updated_at   = now()
   where id = p_project_id;

  return json_build_object('status', v_status, 'branch', v_branch,
                           'positions_closed', v_count, 'total_paid', v_paid,
                           'settlement_price', v_settle_px);
end;
$$;

-- ---------------------------------------------------------------------------
-- rpc_cancel_project: artist/owner cancels -> 100% refund.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_cancel_project(p_project_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_ok boolean;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  select exists (
    select 1 from public.artist_projects ap
    join public.artist_profiles pr on pr.id = ap.artist_profile_id
    where ap.id = p_project_id and pr.user_id = v_uid
  ) into v_ok;
  if not v_ok then raise exception 'Not authorized to cancel this project' using errcode = '42501'; end if;
  return public.rpc_settle_project(p_project_id, 'cancel');
end;
$$;

-- ---------------------------------------------------------------------------
-- Cron helpers (safe for any authenticated caller — only act on genuinely-due data).
-- ---------------------------------------------------------------------------
create or replace function public.rpc_expire_due_projects()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare r record; n int := 0;
begin
  for r in
    select id from public.artist_projects
    where status in ('funding','active')
      and ( (status = 'funding' and funding_deadline is not null and funding_deadline < now())
         or (status = 'active'  and maturity_date   is not null and maturity_date   < now()) )
  loop
    perform public.rpc_settle_project(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

create or replace function public.rpc_snapshot_all_portfolios()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare r record; n int := 0;
begin
  for r in select user_id from public.paper_wallets loop
    perform public._snapshot_user(r.user_id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function public.rpc_invest(uuid, numeric)                to authenticated;
grant execute on function public.rpc_open_paper_position(uuid, numeric)   to authenticated;
grant execute on function public.rpc_exit_position(uuid)                  to authenticated;
grant execute on function public.rpc_cancel_project(uuid)                 to authenticated;
grant execute on function public.rpc_expire_due_projects()               to authenticated;
grant execute on function public.rpc_snapshot_portfolio()                to authenticated;
grant execute on function public.rpc_ensure_paper_wallet()               to authenticated;
grant execute on function public.rpc_reset_paper_account()               to authenticated;
-- rpc_settle_project / rpc_snapshot_all_portfolios / rpc_reprice_all_projects:
-- service_role / cron only (NOT granted to authenticated).
