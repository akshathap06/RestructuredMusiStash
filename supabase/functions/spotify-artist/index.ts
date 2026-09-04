// Spotify proxy.
//
// The client-credentials secret must never reach the app bundle, so every
// Spotify call the app makes goes through here. The function holds the token in
// module scope and reuses it until just before it expires.
//
// Secrets (set with `supabase secrets set`):
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
//
// POST { action: 'search'   , query: string, limit?: number }
// POST { action: 'artist'   , artistId: string }
// POST { action: 'topTracks', artistId: string, market?: string }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const id = Deno.env.get('SPOTIFY_CLIENT_ID');
  const secret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  if (!id || !secret) throw new Error('Spotify credentials are not configured');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: id,
      client_secret: secret,
    }),
  });
  if (!res.ok) throw new Error(`Spotify token request failed (${res.status})`);

  const json = await res.json();
  cachedToken = {
    value: json.access_token,
    // Renew a minute early so an in-flight request cannot straddle expiry.
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

async function spotify(path: string): Promise<any> {
  const token = await getToken();
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    cachedToken = null; // token rejected — force a refresh on the next call
    throw new Error('Spotify rejected the token');
  }
  if (!res.ok) throw new Error(`Spotify request failed (${res.status})`);
  return res.json();
}

/** Spotify IDs are 22-char base62. Reject anything else so a caller can't
 *  smuggle path segments or a query string into the Spotify API path. */
function assertSpotifyId(id: unknown): string {
  const s = String(id ?? '').trim();
  if (!/^[A-Za-z0-9]{22}$/.test(s)) throw new Error('Invalid Spotify artist id');
  return s;
}

/** Only the fields the app actually renders — the raw payload is huge. */
function slimArtist(a: any) {
  return {
    spotifyId: a.id,
    name: a.name,
    followers: a.followers?.total ?? 0,
    popularity: a.popularity ?? 0,
    genres: a.genres ?? [],
    imageUrl: a.images?.[0]?.url ?? null,
    url: a.external_urls?.spotify ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'search') {
      const q = String(body.query ?? '').trim().slice(0, 120);
      if (!q) throw new Error('query is required');
      const limit = Math.min(Number(body.limit) || 8, 20);
      const data = await spotify(
        `/search?q=${encodeURIComponent(q)}&type=artist&limit=${limit}`,
      );
      return json({ artists: (data.artists?.items ?? []).map(slimArtist) });
    }

    if (action === 'artist') {
      const id = assertSpotifyId(body.artistId);
      return json({ artist: slimArtist(await spotify(`/artists/${id}`)) });
    }

    if (action === 'topTracks') {
      const id = assertSpotifyId(body.artistId);
      const market = (String(body.market ?? 'US').match(/^[A-Za-z]{2}$/)?.[0] ?? 'US').toUpperCase();
      const data = await spotify(`/artists/${id}/top-tracks?market=${market}`);
      return json({
        tracks: (data.tracks ?? []).map((t: any) => ({
          spotifyId: t.id,
          title: t.name,
          popularity: t.popularity ?? 0,
          durationSeconds: Math.round((t.duration_ms ?? 0) / 1000),
          artworkUrl: t.album?.images?.[0]?.url ?? null,
          album: t.album?.name ?? null,
          // Spotify stopped serving previews to apps registered after Nov 2024;
          // the client falls back to the iTunes Search API for playable audio.
          previewUrl: t.preview_url ?? null,
        })),
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 400);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
