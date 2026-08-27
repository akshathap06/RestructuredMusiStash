-- Paper Mobile redesign / Phase 1 — money-mutating paper-trading RPCs.
-- All SECURITY DEFINER so a single transaction keeps wallet balance, positions,
-- the transaction ledger, project backing totals, valuation marks and portfolio
-- snapshots consistent. The client never writes these tables directly for
-- mutations. auth.uid() is the actor; callers cannot act for another user.

-- ---------------------------------------------------------------------------
-- rpc_ensure_paper_wallet: idempotent $10,000 grant. Returns the wallet row.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_ensure_paper_wallet()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  insert into public.paper_wallets (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  return (select row_to_json(w) from public.paper_wallets w where w.user_id = v_uid);
end;
$$;

-- ---------------------------------------------------------------------------
-- rpc_open_paper_position: debit wallet, open/merge a position, write the
-- ledger row, bump project backing totals, record a valuation mark and a
-- portfolio snapshot, and drop a notification. Returns { wallet, position,
-- transaction }.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_open_paper_position(
  p_project_id uuid,
  p_amount     numeric
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_share_price    numeric;
  v_title          text;
  v_balance        numeric;
  v_new_balance    numeric;
  v_shares         numeric;
  v_is_new_backer  boolean;
  v_position       public.paper_positions%rowtype;
  v_tx             public.paper_transactions%rowtype;
  v_positions_val  numeric;
  v_backing_total  numeric;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero' using errcode = '22023';
  end if;

  select ap.current_paper_share_price, ap.title
    into v_share_price, v_title
  from public.artist_projects ap
  where ap.id = p_project_id;

  if not found then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;
  if v_share_price is null or v_share_price <= 0 then
    v_share_price := 10;
  end if;

  insert into public.paper_wallets (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  select balance into v_balance
  from public.paper_wallets
  where user_id = v_uid
  for update;

  if v_balance < p_amount then
    raise exception 'Insufficient paper balance' using errcode = 'P0001';
  end if;

  v_shares      := p_amount / v_share_price;
  v_new_balance := v_balance - p_amount;

  update public.paper_wallets
     set balance = v_new_balance, updated_at = now()
   where user_id = v_uid;

  select (count(*) = 0) into v_is_new_backer
  from public.paper_positions
  where user_id = v_uid and project_id = p_project_id;

  insert into public.paper_positions (user_id, project_id, amount, shares, entry_share_price, status)
  values (v_uid, p_project_id, p_amount, v_shares, v_share_price, 'open')
  on conflict (user_id, project_id) do update
    set amount            = public.paper_positions.amount + excluded.amount,
        shares            = public.paper_positions.shares + excluded.shares,
        entry_share_price = (public.paper_positions.amount + excluded.amount)
                            / nullif(public.paper_positions.shares + excluded.shares, 0),
        status            = 'open'
  returning * into v_position;

  insert into public.paper_transactions (user_id, project_id, type, amount, balance_after)
  values (v_uid, p_project_id, 'open_position', -p_amount, v_new_balance)
  returning * into v_tx;

  update public.artist_projects
     set paper_backing_total = paper_backing_total + p_amount,
         paper_backer_count  = paper_backer_count + (case when v_is_new_backer then 1 else 0 end),
         updated_at          = now()
   where id = p_project_id
  returning paper_backing_total into v_backing_total;

  -- Valuation mark: the project's running paper backing total over time.
  insert into public.project_valuations (project_id, value)
  values (p_project_id, v_backing_total);

  -- Portfolio snapshot: cash + mark-to-market of open positions.
  select coalesce(sum(pp.shares * ap.current_paper_share_price), 0)
    into v_positions_val
  from public.paper_positions pp
  join public.artist_projects ap on ap.id = pp.project_id
  where pp.user_id = v_uid and pp.status = 'open';

  insert into public.paper_portfolio_snapshots (user_id, value)
  values (v_uid, v_new_balance + v_positions_val);

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_uid,
    'paper_backed',
    'Paper position opened',
    'You paper-backed ' || coalesce(v_title, 'a project') || ' with $' || trim(to_char(p_amount, 'FM999999990.00')),
    jsonb_build_object('project_id', p_project_id, 'amount', p_amount)
  );

  return json_build_object(
    'wallet',      (select row_to_json(w) from public.paper_wallets w where w.user_id = v_uid),
    'position',    row_to_json(v_position),
    'transaction', row_to_json(v_tx)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- rpc_reset_paper_account: wipe positions + ledger, restore $10,000.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_reset_paper_account()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  delete from public.paper_positions    where user_id = v_uid;
  delete from public.paper_transactions where user_id = v_uid;

  insert into public.paper_wallets (user_id, balance)
  values (v_uid, 10000)
  on conflict (user_id) do update set balance = 10000, updated_at = now();

  insert into public.paper_transactions (user_id, type, amount, balance_after)
  values (v_uid, 'initial_grant', 10000, 10000);

  insert into public.paper_portfolio_snapshots (user_id, value)
  values (v_uid, 10000);

  return (select row_to_json(w) from public.paper_wallets w where w.user_id = v_uid);
end;
$$;

-- ---------------------------------------------------------------------------
-- rpc_snapshot_portfolio: record one portfolio-value snapshot for the caller.
-- Called opportunistically by the client on Portfolio load when the newest
-- snapshot is stale; also the unit a future daily cron would call per user.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_snapshot_portfolio()
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_cash  numeric;
  v_pos   numeric;
  v_total numeric;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  insert into public.paper_wallets (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  select balance into v_cash from public.paper_wallets where user_id = v_uid;

  select coalesce(sum(pp.shares * ap.current_paper_share_price), 0)
    into v_pos
  from public.paper_positions pp
  join public.artist_projects ap on ap.id = pp.project_id
  where pp.user_id = v_uid and pp.status = 'open';

  v_total := coalesce(v_cash, 0) + coalesce(v_pos, 0);

  insert into public.paper_portfolio_snapshots (user_id, value)
  values (v_uid, v_total);

  return v_total;
end;
$$;

grant execute on function public.rpc_ensure_paper_wallet()                to authenticated;
grant execute on function public.rpc_open_paper_position(uuid, numeric)   to authenticated;
grant execute on function public.rpc_reset_paper_account()                to authenticated;
grant execute on function public.rpc_snapshot_portfolio()                 to authenticated;
