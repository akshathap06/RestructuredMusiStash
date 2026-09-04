-- Account deletion must also remove the person's waitlist row (it holds their
-- email). The FK was ON DELETE SET NULL, which left an orphaned PII row behind
-- and kept the public counter inflated after someone left.
alter table public.waitlist_entries
  drop constraint if exists waitlist_entries_user_id_fkey;

alter table public.waitlist_entries
  add constraint waitlist_entries_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
