-- Paper Mobile redesign / Phase 1 — paper-trading wiring
-- One open position row per (user, project); enables clean upsert-merge in
-- rpc_open_paper_position. paper_positions is empty in prod so this is safe.

alter table public.paper_positions
  add constraint paper_positions_user_project_key unique (user_id, project_id);
