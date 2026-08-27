-- V2 restructure (applied to prod 2026-08-25 via Management API).
-- Kept in public: users, artist_profiles, posts, post_likes, comments,
--   comment_likes, follow_relationships, blocked_users, content_reports, feature_flags.
-- Everything else (65 tables: internal_* CRM, events/venues, messaging,
--   marketplace/service providers, legacy investing, dupes) moved to `archive` schema.
-- artist_profiles base64 photo columns were backed up to
--   archive.artist_profiles_photos_backup then nulled (54MB -> 680kB).

create schema if not exists archive;

-- Paper-trading core -------------------------------------------------------

create table if not exists public.paper_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(12,2) not null default 10000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artist_projects (
  id uuid primary key default gen_random_uuid(),
  artist_profile_id uuid not null references public.artist_profiles(id) on delete cascade,
  title text not null,
  type text not null default 'EP',
  short_description text,
  full_description text,
  artwork_url text,
  hero_image_url text,
  funding_goal numeric(12,2) not null,
  paper_backing_total numeric(12,2) not null default 0,
  paper_backer_count integer not null default 0,
  current_paper_share_price numeric(12,4) not null default 10,
  days_remaining integer default 30,
  status text not null default 'live',
  use_of_funds jsonb not null default '[]',
  milestones jsonb not null default '[]',
  deliverables jsonb not null default '[]',
  scenario_targets jsonb not null default '[]',
  timeline jsonb not null default '[]',
  risks jsonb not null default '[]',
  ai_analysis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.paper_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.artist_projects(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  shares numeric(14,4) not null default 0,
  entry_share_price numeric(12,4) not null default 10,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.paper_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.artist_projects(id) on delete set null,
  type text not null,
  amount numeric(12,2) not null,
  balance_after numeric(12,2),
  created_at timestamptz not null default now()
);

create table if not exists public.project_valuations (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.artist_projects(id) on delete cascade,
  value numeric(14,4) not null,
  recorded_at timestamptz not null default now()
);

-- Support tables ------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'general',
  title text not null,
  body text,
  data jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null unique,
  role text not null default 'fan',
  genres text[] not null default '{}',
  referral_code text,
  source text,
  created_at timestamptz not null default now()
);

-- RLS ------------------------------------------------------------------------

alter table public.paper_wallets enable row level security;
alter table public.paper_positions enable row level security;
alter table public.paper_transactions enable row level security;
alter table public.artist_projects enable row level security;
alter table public.project_valuations enable row level security;
alter table public.notifications enable row level security;
alter table public.waitlist_entries enable row level security;

create policy wallet_own on public.paper_wallets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy positions_own on public.paper_positions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy tx_own on public.paper_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy projects_read_all on public.artist_projects for select using (true);
create policy projects_write_owner on public.artist_projects for insert with check (exists (select 1 from public.artist_profiles ap where ap.id = artist_profile_id and ap.user_id = auth.uid()));
create policy projects_update_owner on public.artist_projects for update using (exists (select 1 from public.artist_profiles ap where ap.id = artist_profile_id and ap.user_id = auth.uid()));
create policy valuations_read_all on public.project_valuations for select using (true);
create policy notif_own_read on public.notifications for select using (auth.uid() = user_id);
create policy notif_own_update on public.notifications for update using (auth.uid() = user_id);
create policy waitlist_insert_any on public.waitlist_entries for insert with check (true);
create policy waitlist_read_own on public.waitlist_entries for select using (auth.uid() = user_id);

-- Indexes ---------------------------------------------------------------------

create index if not exists idx_projects_artist on public.artist_projects (artist_profile_id);
create index if not exists idx_projects_status on public.artist_projects (status) where status = 'live';
create index if not exists idx_positions_user on public.paper_positions (user_id);
create index if not exists idx_positions_project on public.paper_positions (project_id);
create index if not exists idx_tx_user_time on public.paper_transactions (user_id, created_at desc);
create index if not exists idx_valuations_project_time on public.project_valuations (project_id, recorded_at);
create index if not exists idx_notifications_user_time on public.notifications (user_id, created_at desc);
create index if not exists idx_posts_user_time on public.posts (user_id, created_at desc);
create index if not exists idx_comments_post on public.comments (post_id, created_at);
create index if not exists idx_follow_follower on public.follow_relationships (follower_id);
create index if not exists idx_follow_artist on public.follow_relationships (artist_id);
create index if not exists idx_artist_profiles_user on public.artist_profiles (user_id);
