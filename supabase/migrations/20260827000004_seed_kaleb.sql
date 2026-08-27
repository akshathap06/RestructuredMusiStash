-- Paper Mobile redesign / Phase 1 — seed the "Kaleb" demo as real rows so the
-- discovery / project / backing flow runs entirely through the live data path
-- instead of a client-side mock. Idempotent (fixed UUIDs + on conflict).
--
-- Fixed IDs (mirrored in src/features/artists/data/kalebDemo.ts):
--   artist_profiles.id  = 11111111-1111-4111-8111-111111111111
--   artist_projects.id  = 22222222-2222-4222-8222-222222222222
-- Kaleb has no auth user (user_id null); popular-track cards fall back to the
-- kalebDemo content in artistExperienceService.

insert into public.artist_profiles (
  id, artist_name, name, genre, status, is_verified, is_approved,
  monthly_listeners, total_streams, location, bio, biography,
  profile_photo_url, banner_photo_url, created_at, updated_at
)
values (
  '11111111-1111-4111-8111-111111111111',
  'KALEB', 'KALEB', array['Alternative R&B'], 'approved', true, true,
  248000, 5400000, 'Atlanta, GA',
  'Music for the hours when the city is quiet and your thoughts aren''t.',
  'Late-night R&B with the room mic left on — hiss, chair creak, a piano two rooms away. Three years of self-released singles out of East Atlanta, now assembling a five-track EP shot on 16mm.',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80',
  now(), now()
)
on conflict (id) do update set
  artist_name = excluded.artist_name,
  genre = excluded.genre,
  status = excluded.status,
  is_verified = excluded.is_verified,
  monthly_listeners = excluded.monthly_listeners,
  location = excluded.location,
  bio = excluded.bio,
  biography = excluded.biography,
  updated_at = now();

insert into public.artist_projects (
  id, artist_profile_id, title, type, short_description, full_description,
  artwork_url, hero_image_url, funding_goal, paper_backing_total,
  paper_backer_count, current_paper_share_price, days_remaining, status,
  use_of_funds, milestones, deliverables, scenario_targets, timeline, risks,
  ai_analysis, created_at, updated_at
)
values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'MIDNIGHT STATIC',
  'EP + Visual Campaign',
  'A five-track EP blending late-night R&B, alt, and cinematic soul.',
  'MIDNIGHT STATIC is a late-night soundtrack for overthinkers and dreamers. An immersive EP paired with visuals and a live launch show in Atlanta. This page is a paper-trading simulation for demand discovery — not a real investment offering.',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
  'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&q=80',
  10000, 7850, 342, 10, 18, 'live',
  '[
    {"id":"f1","label":"Studio recording","amount":3000,"percent":30},
    {"id":"f2","label":"Mixing & mastering","amount":2000,"percent":20},
    {"id":"f3","label":"Marketing","amount":2000,"percent":20},
    {"id":"f4","label":"Music video","amount":1500,"percent":15},
    {"id":"f5","label":"Distribution & ops","amount":1500,"percent":15}
  ]'::jsonb,
  '[
    {"id":"m1","title":"Tracking complete","status":"done","targetLabel":"Week 2"},
    {"id":"m2","title":"Mix lock","status":"planned","targetLabel":"Week 6"},
    {"id":"m3","title":"Visuals drop","status":"planned","targetLabel":"Week 10"},
    {"id":"m4","title":"Atlanta launch show","status":"planned","targetLabel":"Week 12"}
  ]'::jsonb,
  '[
    {"id":"d1","label":"5-track EP","icon":"musical-notes"},
    {"id":"d2","label":"2 visuals","icon":"videocam"},
    {"id":"d3","label":"Launch show","icon":"mic"}
  ]'::jsonb,
  '[
    {"weeks":4,"targetPaperSharePrice":10.8,"label":"4 weeks"},
    {"weeks":12,"targetPaperSharePrice":12.8,"label":"12 weeks"},
    {"weeks":24,"targetPaperSharePrice":14.2,"label":"24 weeks"}
  ]'::jsonb,
  '[
    "Weeks 1-3: Record & arrange",
    "Weeks 4-6: Mix, master, artwork",
    "Weeks 7-10: Visuals + campaign",
    "Weeks 11-12: Release + launch show"
  ]'::jsonb,
  '[
    "Simulated values can move up or down based on engagement signals.",
    "Creative timelines may slip; milestones are illustrative.",
    "No ownership, royalties, or securities are conveyed by paper backing."
  ]'::jsonb,
  '{
    "score":87,"label":"Strong",
    "summary":"Momentum is led by listener growth and engagement.",
    "factors":[
      {"label":"Audience growth","score":88,"explanation":"+18.4% recent listener growth (illustrative)."},
      {"label":"Engagement","score":87,"explanation":"Saves and replays above peer baseline."},
      {"label":"Release consistency","score":84,"explanation":"Steady content cadence over 90 days."},
      {"label":"Project clarity","score":90,"explanation":"Clear deliverables and use-of-funds plan."}
    ],
    "generatedAt":"2026-08-01"
  }'::jsonb,
  now(), now()
)
on conflict (id) do update set
  paper_backing_total = excluded.paper_backing_total,
  paper_backer_count = excluded.paper_backer_count,
  status = excluded.status,
  use_of_funds = excluded.use_of_funds,
  milestones = excluded.milestones,
  deliverables = excluded.deliverables,
  scenario_targets = excluded.scenario_targets,
  ai_analysis = excluded.ai_analysis,
  updated_at = now();
