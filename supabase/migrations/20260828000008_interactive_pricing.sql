-- MusiStash Paper-Investing / interactive pricing.
--  * every INVEST / early-exit nudges the model price (bounded ±3%/trade)
--  * new projects get a seeded ~14-day price history (rpc_seed_project_history)
--  * the scheduled-reprice staleness guard drops 20h -> 6h

-- ---------------------------------------------------------------------------
-- rpc_reprice_project: same logic, guard 20h -> 6h.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_reprice_project(p_project_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  p          record;
  s          record;
  v_old      numeric;
  v_fair     numeric;
  v_new      numeric;
  v_max_move numeric;
begin
  select * into p from public.artist_projects where id = p_project_id for update;
  if not found then raise exception 'Project not found' using errcode = 'P0002'; end if;
  if p.last_priced_at is not null and p.last_priced_at > now() - interval '6 hours' then
    return p.current_paper_share_price;
  end if;

  select * into s from public.fn_project_scores(p_project_id);

  update public.artist_projects
     set resonance_score  = s.resonance,
         similarity_score = s.similarity,
         momentum_score   = s.momentum,
         risk_score       = s.risk,
         projected_roi    = s.projected_roi,
         ai_analysis = coalesce(ai_analysis, '{}'::jsonb) || jsonb_build_object(
           'resonanceScore',  s.resonance,
           'similarityScore', s.similarity,
           'momentumScore',   s.momentum,
           'riskScore',       s.risk,
           'projectedROI',    s.projected_roi,
           'score',           s.momentum,
           'label', case when s.momentum >= 80 then 'Strong'
                         when s.momentum >= 60 then 'Building'
                         else 'Early' end,
           'generatedAt', now()
         )
   where id = p_project_id;

  v_old      := greatest(coalesce(p.current_paper_share_price, p.initial_price, 10), 0.01);
  v_fair     := public.fn_project_model_price(p_project_id);
  v_max_move := v_old * 0.08;
  v_new      := v_old + (v_fair - v_old) * 0.30;
  v_new      := greatest(v_old - v_max_move, least(v_old + v_max_move, v_new));
  v_new      := round(greatest(v_new, coalesce(p.initial_price, 10) * 0.4), 4);

  update public.artist_projects
     set current_paper_share_price = v_new, last_priced_at = now(), updated_at = now()
   where id = p_project_id;

  insert into public.project_valuations (project_id, value, source)
  values (p_project_id, v_new, 'schedule');

  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- rpc_seed_project_history: deterministic ~14-day chart for a fresh project.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_seed_project_history(p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_owns  boolean;
  v_count int;
  v_base  numeric;
  v_price numeric;
  v_fair  numeric;
  v_new   numeric;
  v_max   numeric;
  v_day   date;
  n       int := 0;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;

  select exists (
    select 1 from public.artist_projects ap
    join public.artist_profiles pr on pr.id = ap.artist_profile_id
    where ap.id = p_project_id and pr.user_id = v_uid
  ) into v_owns;
  if not v_owns then raise exception 'Not authorized' using errcode = '42501'; end if;

  select count(*) into v_count from public.project_valuations where project_id = p_project_id;
  if v_count >= 2 then return 0; end if;

  select coalesce(initial_price, current_paper_share_price, 10)
    into v_base from public.artist_projects where id = p_project_id;

  v_price := v_base;
  v_day   := current_date - 14;
  while v_day <= current_date loop
    v_fair := public.fn_project_model_price(p_project_id, v_day::timestamptz);
    v_max  := v_price * 0.08;
    v_new  := v_price + (v_fair - v_price) * 0.30;
    v_new  := greatest(v_price - v_max, least(v_price + v_max, v_new));
    v_new  := round(greatest(v_new, v_base * 0.4), 4);
    insert into public.project_valuations (project_id, value, source, recorded_at)
    values (p_project_id, v_new, 'seed', v_day::timestamptz + interval '8 hours');
    v_price := v_new;
    v_day   := v_day + 1;
    n := n + 1;
  end loop;

  update public.artist_projects
     set current_paper_share_price = round(v_price, 4),
         last_priced_at = now(),
         updated_at = now()
   where id = p_project_id;

  return n;
end;
$$;

grant execute on function public.rpc_seed_project_history(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- rpc_invest: unchanged flow + an intra-trade price nudge toward fair value.
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
  v_fair          numeric;
  v_nudge         numeric;
  v_max           numeric;
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

  -- Funding transition.
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

  -- Intra-trade price nudge: 15% toward fresh fair value, clamped ±3%.
  v_fair  := public.fn_project_model_price(p_project_id);
  v_nudge := v_price + (v_fair - v_price) * 0.15;
  v_max   := v_price * 0.03;
  v_nudge := greatest(v_price - v_max, least(v_price + v_max, v_nudge));
  v_nudge := round(greatest(v_nudge, coalesce(proj.initial_price, 10) * 0.4), 4);
  update public.artist_projects
     set current_paper_share_price = v_nudge, last_priced_at = now()
   where id = p_project_id;

  insert into public.paper_transactions (user_id, project_id, type, amount, units, price, balance_after)
  values (v_uid, p_project_id, 'INVEST', -p_amount, v_units, v_price, v_new_balance)
  returning * into v_tx;

  insert into public.project_valuations (project_id, value, source)
  values (p_project_id, v_nudge, 'trade');

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

-- ---------------------------------------------------------------------------
-- rpc_exit_position: unchanged flow + a downward nudge while still funding.
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
  v_fair      numeric;
  v_nudge     numeric;
  v_max       numeric;
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

  if proj.status = 'funding' then
    update public.artist_projects
       set paper_backing_total = greatest(paper_backing_total - pos.amount, 0),
           paper_backer_count  = greatest(paper_backer_count - 1, 0),
           total_units         = greatest(total_units - pos.shares, 0),
           updated_at          = now()
     where id = p_project_id;

    -- downward nudge (demand fell)
    v_fair  := public.fn_project_model_price(p_project_id);
    v_nudge := v_price + (v_fair - v_price) * 0.15;
    v_max   := v_price * 0.03;
    v_nudge := greatest(v_price - v_max, least(v_price + v_max, v_nudge));
    v_nudge := round(greatest(v_nudge, coalesce(proj.initial_price, 10) * 0.4), 4);
    update public.artist_projects
       set current_paper_share_price = v_nudge, last_priced_at = now()
     where id = p_project_id;
    insert into public.project_valuations (project_id, value, source)
    values (p_project_id, v_nudge, 'trade');
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
