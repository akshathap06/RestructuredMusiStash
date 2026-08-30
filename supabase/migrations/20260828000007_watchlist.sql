-- MusiStash Paper-Investing / watchlist (saved projects).

create table if not exists public.paper_watchlist (
  user_id    uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.artist_projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create index if not exists idx_watchlist_user
  on public.paper_watchlist (user_id, created_at desc);

alter table public.paper_watchlist enable row level security;

drop policy if exists watchlist_own on public.paper_watchlist;
create policy watchlist_own on public.paper_watchlist
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
