-- MusiStash Paper-Investing Engine / step 4 — daily schedule + demo price history.

-- ---------------------------------------------------------------------------
-- pg_cron: reprice every live project, settle anything past its deadline /
-- maturity, and snapshot every portfolio, once a day.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;

select cron.schedule(
  'musistash-paper-daily',
  '0 8 * * *',
  $job$
    select public.rpc_reprice_all_projects();
    select public.rpc_expire_due_projects();
    select public.rpc_snapshot_all_portfolios();
  $job$
);

-- ---------------------------------------------------------------------------
-- Seed a deterministic ~45-day model-price history for the Kaleb demo project
-- so its price chart has shape from day one. Walks the same smoothing the
-- scheduler uses (30% pull toward fair value, ±8%/day clamp).
-- ---------------------------------------------------------------------------
do $$
declare
  k uuid := '22222222-2222-4222-8222-222222222222';
  v_day date := current_date - 45;
  v_price numeric := 10;
  v_fair numeric;
  v_new numeric;
  v_max_move numeric;
begin
  if not exists (select 1 from public.artist_projects where id = k) then
    return;
  end if;

  delete from public.project_valuations where project_id = k;

  while v_day <= current_date loop
    v_fair := public.fn_project_model_price(k, v_day::timestamptz);
    v_max_move := v_price * 0.08;
    v_new := v_price + (v_fair - v_price) * 0.30;
    v_new := greatest(v_price - v_max_move, least(v_price + v_max_move, v_new));
    v_new := round(greatest(v_new, 4), 4);

    insert into public.project_valuations (project_id, value, source, recorded_at)
    values (k, v_new, 'seed', v_day::timestamptz + interval '8 hours');

    v_price := v_new;
    v_day := v_day + 1;
  end loop;

  update public.artist_projects
     set current_paper_share_price = round(v_price, 4),
         last_priced_at = now(),
         updated_at = now()
   where id = k;
end $$;
