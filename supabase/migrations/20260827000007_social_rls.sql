-- Paper Mobile redesign / Phase 1 — RLS for the social tables.
-- These shipped with RLS DISABLED (everything allowed). Enable it with
-- permissive policies that preserve current app behaviour:
--   * anyone (incl. anon) can read
--   * a signed-in user can only write rows they own
-- The content-moderation edge functions use the service role and bypass RLS.
-- Paired rollback: 20260827000007_social_rls_down.sql

-- posts -------------------------------------------------------------------
alter table public.posts enable row level security;

drop policy if exists posts_read_all   on public.posts;
drop policy if exists posts_write_own   on public.posts;
drop policy if exists posts_update_own  on public.posts;
drop policy if exists posts_delete_own  on public.posts;

create policy posts_read_all  on public.posts for select using (true);
create policy posts_write_own on public.posts for insert with check (auth.uid() = user_id);
create policy posts_update_own on public.posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy posts_delete_own on public.posts for delete using (auth.uid() = user_id);

-- comments --------------------------------------------------------------
alter table public.comments enable row level security;

drop policy if exists comments_read_all  on public.comments;
drop policy if exists comments_write_own  on public.comments;
drop policy if exists comments_update_own on public.comments;
drop policy if exists comments_delete_own on public.comments;

create policy comments_read_all  on public.comments for select using (true);
create policy comments_write_own on public.comments for insert with check (auth.uid() = user_id);
create policy comments_update_own on public.comments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy comments_delete_own on public.comments for delete using (auth.uid() = user_id);

-- post_likes ----------------------------------------------------------
alter table public.post_likes enable row level security;

drop policy if exists post_likes_read_all  on public.post_likes;
drop policy if exists post_likes_write_own on public.post_likes;
drop policy if exists post_likes_delete_own on public.post_likes;

create policy post_likes_read_all  on public.post_likes for select using (true);
create policy post_likes_write_own on public.post_likes for insert with check (auth.uid() = user_id);
create policy post_likes_delete_own on public.post_likes for delete using (auth.uid() = user_id);

-- comment_likes ----------------------------------------------------
alter table public.comment_likes enable row level security;

drop policy if exists comment_likes_read_all  on public.comment_likes;
drop policy if exists comment_likes_write_own on public.comment_likes;
drop policy if exists comment_likes_delete_own on public.comment_likes;

create policy comment_likes_read_all  on public.comment_likes for select using (true);
create policy comment_likes_write_own on public.comment_likes for insert with check (auth.uid() = user_id);
create policy comment_likes_delete_own on public.comment_likes for delete using (auth.uid() = user_id);

-- blocked_users --------------------------------------------------
alter table public.blocked_users enable row level security;

drop policy if exists blocked_users_own on public.blocked_users;

create policy blocked_users_own on public.blocked_users
  for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);
