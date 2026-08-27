-- MusiStash Paper-Investing Engine / step 1 — additive schema for the project
-- lifecycle, model-price/settlement bookkeeping, analytics events, and waitlist
-- source tracking. All additive; existing rows preserved.

-- ---------------------------------------------------------------------------
-- artist_projects: lifecycle dates, price bookkeeping, derived AI scores
-- ---------------------------------------------------------------------------
alter table public.artist_projects
  add column if not exists initial_price        numeric(12,4) not null default 10,
  add column if not exists settlement_price     numeric(12,4),
  add column if not exists outcome              text,
  add column if not exists launched_at          timestamptz not null default now(),
  add column if not exists funding_window_days  integer not null default 30,
  add column if not exists term_weeks           integer not null default 12,
  add column if not exists funding_deadline     timestamptz,
  add column if not exists maturity_date        timestamptz,
  add column if not exists funded_at            timestamptz,
  add column if not exists completed_at         timestamptz,
  add column if not exists failed_at            timestamptz,
  add column if not exists cancelled_at         timestamptz,
  add column if not exists last_priced_at       timestamptz,
  add column if not exists total_units          numeric(16,4) not null default 0,
  add column if not exists resonance_score      integer,
  add column if not exists similarity_score     integer,
  add column if not exists momentum_score       integer,
  add column if not exists risk_score           integer,
  add column if not exists projected_roi        numeric(8,4);

-- Normalise legacy status values before constraining.
update public.artist_projects set status = 'funding' where status in ('live', 'draft', '');
update public.artist_projects
  set funding_deadline = coalesce(funding_deadline, launched_at + (funding_window_days || ' days')::interval);

alter table public.artist_projects drop constraint if exists artist_projects_status_chk;
alter table public.artist_projects
  add constraint artist_projects_status_chk
  check (status in ('draft','funding','funded','active','completed','failed','cancelled'));

alter table public.artist_projects drop constraint if exists artist_projects_outcome_chk;
alter table public.artist_projects
  add constraint artist_projects_outcome_chk
  check (outcome is null or outcome in ('funded_settled','failed_refund','cancelled_refund'));

-- ---------------------------------------------------------------------------
-- paper_positions: exit / settlement bookkeeping (table is empty in prod)
-- ---------------------------------------------------------------------------
alter table public.paper_positions
  add column if not exists realized_pnl   numeric(14,2),
  add column if not exists proceeds       numeric(14,2),
  add column if not exists exit_price     numeric(12,4),
  add column if not exists closed_at      timestamptz,
  add column if not exists settlement_ref uuid;

alter table public.paper_positions drop constraint if exists paper_positions_status_chk;
alter table public.paper_positions
  add constraint paper_positions_status_chk
  check (status in ('open','closed','settled','refunded'));

-- ---------------------------------------------------------------------------
-- paper_transactions: spec vocabulary + units/price (empty in prod)
-- ---------------------------------------------------------------------------
alter table public.paper_transactions
  add column if not exists units numeric(16,4),
  add column if not exists price numeric(12,4);

update public.paper_transactions set type = 'PAPER_CASH_INITIALIZED' where type in ('initial_grant','grant');
update public.paper_transactions set type = 'INVEST'                 where type in ('open_position','buy');
update public.paper_transactions set type = 'SELL'                   where type in ('close_position','sell');
update public.paper_transactions set type = 'ADJUSTMENT'             where type in ('adjustment');

alter table public.paper_transactions drop constraint if exists paper_transactions_type_chk;
alter table public.paper_transactions
  add constraint paper_transactions_type_chk
  check (type in (
    'PAPER_CASH_INITIALIZED','INVEST','SELL',
    'PROJECT_SETTLEMENT','FAILED_PROJECT_REFUND','PROJECT_CANCELLATION_REFUND',
    'ADJUSTMENT'
  ));

-- ---------------------------------------------------------------------------
-- project_valuations: mark source (value is now the MODEL PRICE, not backing total)
-- ---------------------------------------------------------------------------
alter table public.project_valuations
  add column if not exists source text not null default 'schedule';
alter table public.project_valuations drop constraint if exists project_valuations_source_chk;
alter table public.project_valuations
  add constraint project_valuations_source_chk
  check (source in ('trade','schedule','seed','milestone'));

-- ---------------------------------------------------------------------------
-- paper_portfolio_snapshots: split cash / invested for the portfolio chart
-- ---------------------------------------------------------------------------
alter table public.paper_portfolio_snapshots
  add column if not exists cash           numeric(14,2),
  add column if not exists invested_value numeric(14,2);

-- ---------------------------------------------------------------------------
-- paper_events: lightweight proof-of-concept analytics
-- ---------------------------------------------------------------------------
create table if not exists public.paper_events (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete set null,
  event      text not null,
  props      jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_paper_events_user_time on public.paper_events (user_id, created_at desc);
create index if not exists idx_paper_events_event_time on public.paper_events (event, created_at desc);

alter table public.paper_events enable row level security;
drop policy if exists paper_events_insert on public.paper_events;
create policy paper_events_insert on public.paper_events
  for insert with check (auth.uid() = user_id or user_id is null);
drop policy if exists paper_events_read_own on public.paper_events;
create policy paper_events_read_own on public.paper_events
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- waitlist_entries: signup channel tracking (screen removed; auto-enrol via trigger)
-- ---------------------------------------------------------------------------
alter table public.waitlist_entries
  add column if not exists auto_enrolled boolean not null default false,
  add column if not exists platform      text not null default 'unknown';
alter table public.waitlist_entries drop constraint if exists waitlist_entries_platform_chk;
alter table public.waitlist_entries
  add constraint waitlist_entries_platform_chk
  check (platform in ('app','web','unknown'));
