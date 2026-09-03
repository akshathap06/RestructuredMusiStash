-- Artist metrics: what we can pull from Spotify, what the artist tells us, and
-- a cached top-track list with playable previews.
--
-- Provenance matters here: these numbers end up on a public profile and on a
-- share card, so verified-from-an-API and typed-in-by-the-artist are stored and
-- labelled separately rather than blended into one number.

alter table public.artist_profiles
  add column if not exists spotify_followers      bigint,
  add column if not exists spotify_popularity     integer,
  -- Spotify exposes neither monthly listeners nor total streams, so those two
  -- can only ever be self-reported until a paid provider is wired in.
  add column if not exists listeners_self_reported boolean not null default true,
  add column if not exists metrics_updated_at     timestamptz,
  -- Resolved tracks: Spotify names + popularity, iTunes preview/artwork.
  add column if not exists top_tracks             jsonb not null default '[]'::jsonb,
  add column if not exists top_tracks_updated_at  timestamptz,
  -- Derived read on the artist, computed from the verifiable signals only.
  add column if not exists artist_report          jsonb;

create index if not exists idx_artist_profiles_spotify_artist_id
  on public.artist_profiles (spotify_artist_id)
  where spotify_artist_id is not null;

comment on column public.artist_profiles.listeners_self_reported is
  'monthly_listeners / total_streams were typed in by the artist, not verified against a provider.';
comment on column public.artist_profiles.top_tracks is
  'Cached [{id,title,previewUrl,artworkUrl,durationSeconds,popularity,source}] so profiles do not re-hit iTunes on every open.';
comment on column public.artist_profiles.artist_report is
  'Derived {score,label,summary,factors[],generatedAt} built from verifiable metrics.';
