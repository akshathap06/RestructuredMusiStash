-- Paper Mobile redesign / Phase 1 — real portfolio-history source.
-- Replaces the synthetic series that paperWalletService.getPortfolioHistory
-- generated. Rows are written by the paper-trading RPCs (open position / reset /
-- opportunistic snapshot) and, later, a daily cron.

create table if not exists public.paper_portfolio_snapshots (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  value       numeric(14,2) not null,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_portfolio_snapshots_user_time
  on public.paper_portfolio_snapshots (user_id, recorded_at);

alter table public.paper_portfolio_snapshots enable row level security;

drop policy if exists snap_own_read on public.paper_portfolio_snapshots;
create policy snap_own_read on public.paper_portfolio_snapshots
  for select using (auth.uid() = user_id);

-- Inserts happen only inside SECURITY DEFINER RPCs (see 20260827000003).
