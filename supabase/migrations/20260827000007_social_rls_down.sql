-- Rollback for 20260827000007_social_rls.sql — restores the pre-migration state
-- (RLS disabled = everything allowed). Apply only if a social flow breaks.

drop policy if exists posts_read_all   on public.posts;
drop policy if exists posts_write_own   on public.posts;
drop policy if exists posts_update_own  on public.posts;
drop policy if exists posts_delete_own  on public.posts;
alter table public.posts disable row level security;

drop policy if exists comments_read_all  on public.comments;
drop policy if exists comments_write_own  on public.comments;
drop policy if exists comments_update_own on public.comments;
drop policy if exists comments_delete_own on public.comments;
alter table public.comments disable row level security;

drop policy if exists post_likes_read_all  on public.post_likes;
drop policy if exists post_likes_write_own on public.post_likes;
drop policy if exists post_likes_delete_own on public.post_likes;
alter table public.post_likes disable row level security;

drop policy if exists comment_likes_read_all  on public.comment_likes;
drop policy if exists comment_likes_write_own on public.comment_likes;
drop policy if exists comment_likes_delete_own on public.comment_likes;
alter table public.comment_likes disable row level security;

drop policy if exists blocked_users_own on public.blocked_users;
alter table public.blocked_users disable row level security;
