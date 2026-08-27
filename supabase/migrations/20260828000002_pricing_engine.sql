-- MusiStash Paper-Investing Engine / step 2 — deterministic pricing engine.
-- fn_project_model_price() is the authoritative "fair value per unit". It is a
-- pure function of stored project/artist signals + a per-project-per-day seeded
-- noise term, so the same (project, day) always yields the same price. Swap the
-- body later without touching callers.

-- ---------------------------------------------------------------------------
-- Deterministic bounded noise in [-0.03, 0.03], stable per (seed, day).
-- ---------------------------------------------------------------------------
create or replace function public.fn_daily_noise(p_seed text, p_day date)
returns numeric
language sql
immutable
as $$
  select round(
    ((abs(hashtextextended(p_seed || '|' || p_day::text, 42)) % 2000001)::numeric
      / 1000000.0 - 1.0) * 0.03
  , 6);
$$;

-- ---------------------------------------------------------------------------
-- Derived AI / analysis scores (0..100, + projected_roi) from real signals.
-- ---------------------------------------------------------------------------
create or replace function public.fn_project_scores(p_project_id uuid)
returns table(resonance int, similarity int, momentum int, risk int, projected_roi numeric)
language plpgsql
stable
as $$
declare
  p          record;
  ap         record;
  v_followers    int;
  v_days         numeric;
  v_progress     numeric;
  v_velocity     numeric;   -- backers / day
  v_listen       numeric;
  v_stream       numeric;
  v_top_target   numeric;
begin
  select * into p from public.artist_projects where id = p_project_id;
  if not found then return; end if;
  select * into ap from public.artist_profiles where id = p.artist_profile_id;

  select count(*) into v_followers
  from public.follow_relationships where artist_id = p.artist_profile_id;

  v_days     := greatest(extract(epoch from (now() - p.launched_at)) / 86400.0, 1);
  v_progress := least(coalesce(p.paper_backing_total, 0) / nullif(p.funding_goal, 0), 1.5);
  v_velocity := coalesce(p.paper_backer_count, 0) / v_days;

  v_listen := least(100, greatest(0,
    ln(greatest(coalesce(ap.monthly_listeners, 0), 1)) / ln(50000000) * 100));
  v_stream := least(100, greatest(0,
    ln(greatest(coalesce(ap.total_streams, 0), 1)) / ln(5000000000) * 100));

  momentum := round(least(100, greatest(0,
        35 * coalesce(v_progress, 0)
      + least(35, v_velocity * 6)
      + 0.30 * coalesce((p.ai_analysis->>'score')::numeric, 50)
  )))::int;

  resonance := round(least(100, greatest(0,
        0.45 * v_listen
      + 0.25 * v_stream
      + least(20, v_followers * 2)
      + least(10, coalesce(array_length(ap.genre, 1), 1) * 3)
  )))::int;

  similarity := round(
    case when coalesce(ap.avg_similarity, 0) > 0 then least(100, ap.avg_similarity * 100)
         else greatest(30, resonance - 15) end
  )::int;

  risk := round(least(100, greatest(0,
        0.6 * (100 - resonance)
      + 0.4 * (100 * (1 - least(coalesce(v_progress, 0), 1)))
  )))::int;

  v_top_target := coalesce((
    select max((t->>'targetPaperSharePrice')::numeric)
    from jsonb_array_elements(coalesce(p.scenario_targets, '[]'::jsonb)) t
  ), coalesce(p.current_paper_share_price, 10) * 1.4);

  projected_roi := round(
      (v_top_target / nullif(coalesce(p.current_paper_share_price, 10), 0) - 1)
      * (0.5 + momentum / 200.0)
  , 4);

  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- Scenario-target price curve, linearly interpolated by elapsed weeks.
-- ---------------------------------------------------------------------------
create or replace function public.fn_scenario_price(p_project_id uuid, p_elapsed_weeks numeric)
returns numeric
language plpgsql
stable
as $$
declare
  p       record;
  v_base  numeric;
  v_lo_w  numeric := 0;
  v_lo_p  numeric;
  r       record;
begin
  select * into p from public.artist_projects where id = p_project_id;
  v_base := coalesce(p.initial_price, 10);
  v_lo_p := v_base;
  if p.scenario_targets is null or jsonb_array_length(p.scenario_targets) = 0 then
    return v_base;
  end if;

  for r in
    select (t->>'weeks')::numeric as w, (t->>'targetPaperSharePrice')::numeric as px
    from jsonb_array_elements(p.scenario_targets) t
    order by (t->>'weeks')::numeric
  loop
    if p_elapsed_weeks <= r.w then
      if r.w = v_lo_w then return r.px; end if;
      return v_lo_p + (r.px - v_lo_p) * ((p_elapsed_weeks - v_lo_w) / (r.w - v_lo_w));
    end if;
    v_lo_w := r.w;
    v_lo_p := r.px;
  end loop;

  return v_lo_p;  -- past the last defined target
end;
$$;

-- ---------------------------------------------------------------------------
-- Authoritative model price (fair value per unit) for a project at a moment.
-- ---------------------------------------------------------------------------
create or replace function public.fn_project_model_price(
  p_project_id uuid,
  p_at timestamptz default now()
)
returns numeric
language plpgsql
stable
as $$
declare
  p              record;
  v_base         numeric;
  v_progress     numeric;
  v_momentum     int;
  v_ms_done      numeric;
  v_ms_total     numeric;
  v_elapsed_wk   numeric;
  v_scenario     numeric;
  v_demand       numeric;
  v_mom_mult     numeric;
  v_ms_mult      numeric;
  v_scn_mult     numeric;
  v_noise        numeric;
  v_fair         numeric;
begin
  select * into p from public.artist_projects where id = p_project_id;
  if not found then return null; end if;

  v_base     := coalesce(p.initial_price, 10);
  v_progress := least(coalesce(p.paper_backing_total, 0) / nullif(p.funding_goal, 0), 1.5);
  v_momentum := coalesce(p.momentum_score,
                         (select momentum from public.fn_project_scores(p_project_id)), 50);

  select count(*) filter (where (m->>'status') = 'done'), count(*)
    into v_ms_done, v_ms_total
  from jsonb_array_elements(coalesce(p.milestones, '[]'::jsonb)) m;

  v_elapsed_wk := case
    when p.funded_at is not null then extract(epoch from (p_at - p.funded_at)) / 604800.0
    else 0 end;
  v_scenario := public.fn_scenario_price(p_project_id, v_elapsed_wk);

  v_demand   := 1 + 0.35 * coalesce(v_progress, 0);
  v_mom_mult := 1 + 0.30 * ((v_momentum - 50) / 50.0);
  v_ms_mult  := 1 + 0.15 * (case when v_ms_total > 0 then v_ms_done / v_ms_total else 0 end);
  v_scn_mult := case when p.funded_at is not null then v_scenario / v_base else 1 end;
  v_noise    := public.fn_daily_noise(p_project_id::text, p_at::date);

  v_fair := v_base * v_demand * v_mom_mult * v_ms_mult * v_scn_mult * (1 + v_noise);
  return round(greatest(v_fair, v_base * 0.4), 4);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reprice one project: smooth toward fair value, clamp daily move, mark history.
-- Idempotent per day (skips if priced in the last 20h).
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
  if p.last_priced_at is not null and p.last_priced_at > now() - interval '20 hours' then
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

create or replace function public.rpc_reprice_all_projects()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare r record; n int := 0;
begin
  for r in
    select id from public.artist_projects where status in ('funding','funded','active')
  loop
    perform public.rpc_reprice_project(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

grant execute on function public.fn_project_model_price(uuid, timestamptz) to authenticated;
grant execute on function public.rpc_reprice_project(uuid)                 to authenticated;
