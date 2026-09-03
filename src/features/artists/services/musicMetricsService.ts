import { supabase } from '../../../lib/supabase';

/**
 * Artist metrics from the sources that actually expose them.
 *
 * Spotify (via the `spotify-artist` edge function, which holds the client
 * secret) gives followers, a 0-100 popularity score, genres, an image and the
 * top-track list. It does NOT expose monthly listeners or total streams at all
 * — those live only on Spotify's own web UI — so the artist types those in and
 * they stay flagged as self-reported.
 *
 * Spotify also stopped returning `preview_url` to apps registered after
 * Nov 2024 (every track comes back null), so playable 30s previews come from
 * the iTunes Search API, which is keyless and still serves them.
 */

export type SpotifyArtist = {
  spotifyId: string;
  name: string;
  followers: number;
  popularity: number;
  genres: string[];
  imageUrl: string | null;
  url: string | null;
};

export type ResolvedTrack = {
  id: string;
  title: string;
  previewUrl: string | null;
  artworkUrl: string | null;
  durationSeconds: number;
  popularity: number;
  source: 'spotify+itunes' | 'spotify' | 'itunes';
};

export type ArtistReport = {
  score: number;
  label: string;
  summary: string;
  factors: { label: string; value: string; detail: string }[];
  generatedAt: string;
};

// ---------------------------------------------------------------------------
// Spotify (through the edge function — never call Spotify directly from here)
// ---------------------------------------------------------------------------

async function callSpotify<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('spotify-artist', { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/** Accepts a full profile URL, a spotify: URI, or a bare 22-char id. */
export function parseSpotifyArtistId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const url = s.match(/artist[/:]([A-Za-z0-9]{22})/);
  if (url) return url[1];
  if (/^[A-Za-z0-9]{22}$/.test(s)) return s;
  return null;
}

export async function searchSpotifyArtists(
  query: string,
  limit = 8,
): Promise<SpotifyArtist[]> {
  const res = await callSpotify<{ artists: SpotifyArtist[] }>({
    action: 'search',
    query,
    limit,
  });
  return res.artists ?? [];
}

export async function getSpotifyArtist(artistId: string): Promise<SpotifyArtist> {
  const res = await callSpotify<{ artist: SpotifyArtist }>({ action: 'artist', artistId });
  return res.artist;
}

type SpotifyTrack = {
  spotifyId: string;
  title: string;
  popularity: number;
  durationSeconds: number;
  artworkUrl: string | null;
  album: string | null;
  previewUrl: string | null;
};

async function getSpotifyTopTracks(artistId: string): Promise<SpotifyTrack[]> {
  const res = await callSpotify<{ tracks: SpotifyTrack[] }>({
    action: 'topTracks',
    artistId,
  });
  return res.tracks ?? [];
}

// ---------------------------------------------------------------------------
// iTunes Search — keyless, and the only reliable source of playable previews
// ---------------------------------------------------------------------------

type ITunesTrack = {
  trackName: string;
  artistName: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
};

/** Strips features, remaster tags and punctuation so titles compare equal. */
function normaliseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/\s*-\s*(remaster|remastered|radio edit|single version|live).*$/i, '')
    .replace(/feat\.?.*$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/** Second pass for a specific title the bulk search missed. */
async function findITunesTrack(
  artistName: string,
  title: string,
): Promise<ITunesTrack | null> {
  const term = `${artistName} ${title}`;
  const url =
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}` +
    `&entity=song&limit=5&country=US`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const results: ITunesTrack[] = (await res.json()).results ?? [];
    const artist = normaliseTitle(artistName);
    const wanted = normaliseTitle(title);
    const sameArtist = results.filter((r) => normaliseTitle(r.artistName).includes(artist));
    return (
      sameArtist.find((r) => normaliseTitle(r.trackName) === wanted && r.previewUrl) ??
      sameArtist.find((r) => r.previewUrl) ??
      null
    );
  } catch {
    return null;
  }
}

async function searchITunes(artistName: string, limit = 50): Promise<ITunesTrack[]> {
  const url =
    `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}` +
    `&entity=song&limit=${limit}&country=US`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes lookup failed (${res.status})`);
  const json = await res.json();
  const wanted = normaliseTitle(artistName);
  // The endpoint matches loosely, so drop other artists' songs.
  return (json.results ?? []).filter(
    (r: ITunesTrack) => normaliseTitle(r.artistName).includes(wanted) || wanted.includes(normaliseTitle(r.artistName)),
  );
}

/**
 * Spotify decides which tracks are the top ones; iTunes supplies the audio.
 * One iTunes request covers the whole list rather than one lookup per track.
 */
export async function resolveTopTracks(
  artistName: string,
  spotifyArtistId?: string | null,
  limit = 6,
): Promise<ResolvedTrack[]> {
  const [spotifyTracks, itunesTracks] = await Promise.all([
    spotifyArtistId
      ? getSpotifyTopTracks(spotifyArtistId).catch(() => [] as SpotifyTrack[])
      : Promise.resolve([] as SpotifyTrack[]),
    searchITunes(artistName).catch(() => [] as ITunesTrack[]),
  ]);

  const byTitle = new Map<string, ITunesTrack>();
  for (const t of itunesTracks) {
    const key = normaliseTitle(t.trackName);
    if (key && !byTitle.has(key)) byTitle.set(key, t);
  }

  if (spotifyTracks.length > 0) {
    const shortlist = spotifyTracks.slice(0, limit);

    // The bulk search only covers what happens to be in the artist's first
    // page of iTunes results, so chase the misses individually — otherwise
    // recent singles show on the profile with a dead play button.
    const targeted = await Promise.all(
      shortlist.map((t) =>
        byTitle.has(normaliseTitle(t.title))
          ? Promise.resolve(null)
          : findITunesTrack(artistName, t.title),
      ),
    );

    const resolved: ResolvedTrack[] = shortlist.map((t, i) => {
      const match = byTitle.get(normaliseTitle(t.title)) ?? targeted[i] ?? undefined;
      const previewUrl = t.previewUrl ?? match?.previewUrl ?? null;
      return {
        id: t.spotifyId,
        title: t.title,
        previewUrl,
        artworkUrl: t.artworkUrl ?? upscale(match?.artworkUrl100),
        durationSeconds: t.durationSeconds || Math.round((match?.trackTimeMillis ?? 0) / 1000),
        popularity: t.popularity,
        source: previewUrl && !t.previewUrl ? 'spotify+itunes' : 'spotify',
      };
    });

    // Keep Spotify's ordering, but float the playable ones so the first thing
    // a visitor taps actually makes a sound.
    return [
      ...resolved.filter((t) => t.previewUrl),
      ...resolved.filter((t) => !t.previewUrl),
    ];
  }

  // No Spotify link — iTunes alone still gives a playable, ordered list.
  return itunesTracks.slice(0, limit).map((t, i) => ({
    id: `itunes-${normaliseTitle(t.trackName) || i}`,
    title: t.trackName,
    previewUrl: t.previewUrl ?? null,
    artworkUrl: upscale(t.artworkUrl100),
    durationSeconds: Math.round((t.trackTimeMillis ?? 0) / 1000),
    popularity: 0,
    source: 'itunes',
  }));
}

/** iTunes returns 100px art; the same URL serves 600px. */
function upscale(url?: string | null): string | null {
  return url ? url.replace('100x100', '600x600') : null;
}

// ---------------------------------------------------------------------------
// Derived report
// ---------------------------------------------------------------------------

/**
 * A read on the artist computed from the signals we can actually verify.
 * Self-reported numbers are deliberately excluded from the score — they would
 * make it trivially inflatable — though they still appear on the profile.
 */
export function buildArtistReport(input: {
  followers?: number | null;
  popularity?: number | null;
  genres?: string[];
  tracks?: ResolvedTrack[];
}): ArtistReport {
  const followers = input.followers ?? 0;
  const popularity = input.popularity ?? 0;
  const genres = input.genres ?? [];
  const tracks = input.tracks ?? [];

  // log10 keeps 1k and 10M on a comparable footing; 10M+ tops out at 100.
  const reach = followers > 0 ? Math.min(100, (Math.log10(followers) / 7) * 100) : 0;
  const catalogue = Math.min(100, tracks.length * 16);
  const breadth = Math.min(100, genres.length * 34);

  const score = Math.round(reach * 0.4 + popularity * 0.4 + catalogue * 0.12 + breadth * 0.08);
  const label =
    score >= 75 ? 'Established' : score >= 50 ? 'Building' : score >= 25 ? 'Emerging' : 'Early';

  const factors = [
    {
      label: 'Reach',
      value: followers > 0 ? compact(followers) : '—',
      detail: followers > 0 ? 'Spotify followers' : 'No Spotify profile linked',
    },
    {
      label: 'Momentum',
      value: popularity > 0 ? `${popularity}/100` : '—',
      detail: "Spotify's popularity index",
    },
    {
      label: 'Catalogue',
      value: String(tracks.length),
      detail: `${tracks.filter((t) => t.previewUrl).length} with playable previews`,
    },
    {
      label: 'Range',
      value: genres.length ? genres.slice(0, 2).join(', ') : '—',
      detail: genres.length > 2 ? `+${genres.length - 2} more genres` : 'Genres from Spotify',
    },
  ];

  return {
    score,
    label,
    summary: summarise(label, followers, popularity, tracks.length),
    factors,
    generatedAt: new Date().toISOString(),
  };
}

function summarise(label: string, followers: number, popularity: number, trackCount: number) {
  if (followers === 0 && popularity === 0) {
    return `${trackCount} tracks on file. Link a Spotify profile to score reach and momentum.`;
  }
  return (
    `${label} — ${compact(followers)} followers and a Spotify popularity of ` +
    `${popularity}/100 across ${trackCount} tracks.`
  );
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export async function saveArtistMetrics(
  artistProfileId: string,
  input: {
    spotify?: SpotifyArtist | null;
    tracks?: ResolvedTrack[];
    monthlyListeners?: number | null;
    totalStreams?: number | null;
  },
): Promise<void> {
  const { spotify: sp, tracks } = input;
  const report = buildArtistReport({
    followers: sp?.followers,
    popularity: sp?.popularity,
    genres: sp?.genres,
    tracks,
  });

  const patch: Record<string, unknown> = {
    artist_report: report,
    metrics_updated_at: new Date().toISOString(),
  };
  if (sp) {
    patch.spotify_artist_id = sp.spotifyId;
    patch.spotify_followers = sp.followers;
    patch.spotify_popularity = sp.popularity;
    patch.spotify_profile_url = sp.url;
    patch.spotify_data = sp;
  }
  if (tracks) {
    patch.top_tracks = tracks;
    patch.top_tracks_updated_at = new Date().toISOString();
  }
  if (input.monthlyListeners != null) {
    patch.monthly_listeners = input.monthlyListeners;
    patch.listeners_self_reported = true;
  }
  if (input.totalStreams != null) {
    patch.total_streams = input.totalStreams;
  }

  const { error } = await supabase
    .from('artist_profiles')
    .update(patch)
    .eq('id', artistProfileId);
  if (error) throw new Error(error.message);
}

/** Refresh cached tracks/metrics when they are older than `maxAgeHours`. */
export async function refreshIfStale(
  profile: {
    id: string;
    artist_name: string;
    spotify_artist_id?: string | null;
    top_tracks_updated_at?: string | null;
  },
  maxAgeHours = 24,
): Promise<void> {
  const last = profile.top_tracks_updated_at
    ? new Date(profile.top_tracks_updated_at).getTime()
    : 0;
  if (Date.now() - last < maxAgeHours * 3600_000) return;

  const [sp, tracks] = await Promise.all([
    profile.spotify_artist_id
      ? getSpotifyArtist(profile.spotify_artist_id).catch(() => null)
      : Promise.resolve(null),
    resolveTopTracks(profile.artist_name, profile.spotify_artist_id).catch(() => []),
  ]);
  if (!sp && tracks.length === 0) return;
  await saveArtistMetrics(profile.id, { spotify: sp, tracks });
}
