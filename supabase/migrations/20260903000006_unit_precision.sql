-- Units were numeric(_,4). At ~$17/unit a $1000 buy resolves to 59.590494…
-- units but stored 59.5905, handing back a fraction of a cent on exit. Money
-- columns stay at scale 2 (exact cents); unit columns move to scale 8 so
-- units * price reproduces the cost basis instead of drifting.
alter table public.paper_positions    alter column shares      type numeric(20,8);
alter table public.paper_transactions alter column units       type numeric(22,8);
alter table public.artist_projects    alter column total_units type numeric(22,8);
