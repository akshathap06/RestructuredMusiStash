#!/usr/bin/env node
/**
 * One-off catch-up for artists created before the metrics pipeline existed.
 *
 * Mirrors musicMetricsService: Spotify for followers/popularity/genres/top
 * tracks, iTunes for playable previews, then a derived report. New profiles get
 * this at onboarding and existing ones refresh on view, so this only exists to
 * backfill rows already in the table.
 *
 *   node scripts/backfill-artist-metrics.mjs [--apply] [--match-by-name]
 *
 * Without --apply it prints what it would do and writes nothing.
 *
 * Safety: a stored spotify_artist_id is only trusted when the Spotify artist's
 * name lines up with the profile name. A mismatch (e.g. a local artist linked to
 * Young Thug) is reported and skipped rather than written — the wrong followers
 * and songs would otherwise land on a real person's public profile.
 *
 * --match-by-name also tries artists with no spotify_artist_id, and accepts only
 * a single exact name match.
 *
 * iTunes throttles hard (~20 req/min/IP). Calls are serialised with a delay and
 * one retry; if it stays throttled the row is still written with Spotify data
 * and the report — previews fill in later when the profile is next viewed.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const APPLY = process.argv.includes('--apply');
const MATCH_BY_NAME = process.argv.includes('--match-by-name');

const PROJECT = 'dwbetxanfumneukrqodd';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3YmV0eGFuZnVtbmV1a3Jxb2RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDI2MzYsImV4cCI6MjA2ODM3ODYzNn0.CO3oIID2omAwuex2qE_dXbOYbtA_v9bC38VQizuXVJc';
const FN = `https://${PROJECT}.supabase.co/functions/v1/spotify-artist`;

// Placeholder rows ("Artist 1a2b3c4d"), single letters, and the fictional demo
// account must never be matched by name. A linked demo account keeps its id.
const SKIP_NAME = /^(artist [0-9a-f]{8}|[a-z]|tee|kaleb)$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let mgmtToken;
async function sql(query) {
  if (!mgmtToken) {
    const { stdout } = await run('/bin/bash', [
      '-c',
      `security find-generic-password -s "Supabase CLI" -w | sed 's/^go-keyring-base64://' | base64 -d`,
    ]);
    mgmtToken = stdout.trim();
  }
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT}/database/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${mgmtToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    },
  );
  const json = await res.json();
  if (json.message) throw new Error(json.message);
  return json;
}

const spotify = async (body) => {
  const res = await fetch(FN, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
};

const norm = (t = '') =>
  t
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/\s*-\s*(remaster|remastered|radio edit|single version|live).*$/i, '')
    .replace(/feat\.?.*$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

const compact = (n) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
    : n >= 1_000
      ? `${Math.round(n / 1_000)}K`
      : String(n);

/** The Spotify name and the profile name must plausibly be the same act. */
function nameMatches(profileName, spotifyName) {
  const a = norm(profileName);
  const b = norm(spotifyName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

// --- iTunes, rate-limit aware --------------------------------------------
let itunesBlocked = false;

async function itunes(url, attempt = 0) {
  if (itunesBlocked) return [];
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'MusiStash/1.0' } });
    const text = await r.text();
    if (!text.trim()) {
      // Empty 200 = throttled. Back off once, then give up for this run.
      if (attempt === 0) {
        await sleep(8000);
        return itunes(url, 1);
      }
      itunesBlocked = true;
      return [];
    }
    return JSON.parse(text).results ?? [];
  } catch {
    return [];
  } finally {
    await sleep(1500);
  }
}

async function itunesBulk(name) {
  const wanted = norm(name);
  const res = await itunes(
    `https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=song&limit=50&country=US`,
  );
  return res.filter((x) => {
    const a = norm(x.artistName);
    return a && (a.includes(wanted) || wanted.includes(a));
  });
}

async function itunesOne(name, title) {
  const res = await itunes(
    `https://itunes.apple.com/search?term=${encodeURIComponent(`${name} ${title}`)}&entity=song&limit=5&country=US`,
  );
  const mine = res.filter((x) => norm(x.artistName).includes(norm(name)));
  return (
    mine.find((x) => norm(x.trackName) === norm(title) && x.previewUrl) ??
    mine.find((x) => x.previewUrl) ??
    null
  );
}

async function resolveTracks(name, artistId, limit = 6) {
  const { tracks = [] } = await spotify({ action: 'topTracks', artistId });
  const bulk = await itunesBulk(name);
  const byTitle = new Map();
  for (const t of bulk) {
    const k = norm(t.trackName);
    if (k && !byTitle.has(k)) byTitle.set(k, t);
  }
  const shortlist = tracks.slice(0, limit);
  const targeted = [];
  for (let i = 0; i < shortlist.length; i++) {
    targeted.push(
      byTitle.has(norm(shortlist[i].title)) ? null : await itunesOne(name, shortlist[i].title),
    );
  }
  const resolved = shortlist.map((t, i) => {
    const m = byTitle.get(norm(t.title)) ?? targeted[i] ?? undefined;
    const previewUrl = t.previewUrl ?? m?.previewUrl ?? null;
    return {
      id: t.spotifyId,
      title: t.title,
      previewUrl,
      artworkUrl: t.artworkUrl ?? (m?.artworkUrl100?.replace('100x100', '600x600') ?? null),
      durationSeconds: t.durationSeconds || Math.round((m?.trackTimeMillis ?? 0) / 1000),
      popularity: t.popularity,
      source: previewUrl && !t.previewUrl ? 'spotify+itunes' : 'spotify',
    };
  });
  return [...resolved.filter((t) => t.previewUrl), ...resolved.filter((t) => !t.previewUrl)];
}

function buildReport(a, tracks) {
  const reach = a.followers > 0 ? Math.min(100, (Math.log10(a.followers) / 7) * 100) : 0;
  const catalogue = Math.min(100, tracks.length * 16);
  const breadth = Math.min(100, (a.genres?.length ?? 0) * 34);
  const score = Math.round(reach * 0.4 + a.popularity * 0.4 + catalogue * 0.12 + breadth * 0.08);
  const label =
    score >= 75 ? 'Established' : score >= 50 ? 'Building' : score >= 25 ? 'Emerging' : 'Early';
  const playable = tracks.filter((t) => t.previewUrl).length;
  return {
    score,
    label,
    summary:
      a.followers === 0 && a.popularity === 0
        ? `${tracks.length} tracks on file. Link a Spotify profile to score reach and momentum.`
        : `${label} — ${compact(a.followers)} followers and a Spotify popularity of ${a.popularity}/100 across ${tracks.length} tracks.`,
    factors: [
      { label: 'Reach', value: a.followers > 0 ? compact(a.followers) : '—', detail: a.followers > 0 ? 'Spotify followers' : 'No Spotify profile linked' },
      { label: 'Momentum', value: a.popularity > 0 ? `${a.popularity}/100` : '—', detail: "Spotify's popularity index" },
      { label: 'Catalogue', value: String(tracks.length), detail: `${playable} with playable previews` },
      { label: 'Range', value: a.genres?.slice(0, 2).join(', ') || '—', detail: (a.genres?.length ?? 0) > 2 ? `+${a.genres.length - 2} more genres` : 'Genres from Spotify' },
    ],
    generatedAt: new Date().toISOString(),
  };
}

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

(async () => {
  const rows = await sql(`
    select id, artist_name, spotify_artist_id
    from public.artist_profiles
    where artist_name is not null and trim(artist_name) <> ''
    order by created_at;
  `);

  const statements = [];
  const report = { enriched: [], matched: [], mismatch: [], skipped: [], failed: [] };

  for (const row of rows) {
    const name = (row.artist_name || '').trim();
    let artistId = row.spotify_artist_id;
    let via = 'linked';

    if (!artistId) {
      if (SKIP_NAME.test(name)) {
        report.skipped.push({ name, why: 'placeholder or demo profile' });
        continue;
      }
      if (!MATCH_BY_NAME) {
        report.skipped.push({ name, why: 'no spotify id (re-run with --match-by-name)' });
        continue;
      }
      try {
        const { artists = [] } = await spotify({ action: 'search', query: name, limit: 5 });
        const exact = artists.filter((a) => norm(a.name) === norm(name));
        if (exact.length !== 1) {
          report.skipped.push({
            name,
            why: exact.length === 0 ? 'no exact Spotify match' : `${exact.length} artists share that name`,
          });
          continue;
        }
        artistId = exact[0].spotifyId;
        via = 'name match';
      } catch (e) {
        report.failed.push({ name, why: e.message });
        continue;
      }
    }

    try {
      const { artist } = await spotify({ action: 'artist', artistId });

      if (!nameMatches(name, artist.name)) {
        report.mismatch.push({ id: row.id, name, spotify: artist.name, artistId, followers: artist.followers });
        console.log(`  ! ${name.padEnd(22)} stored id points at "${artist.name}" (${compact(artist.followers)} followers) — skipped`);
        continue;
      }

      const tracks = await resolveTracks(name, artistId);
      const rep = buildReport(artist, tracks);
      const playable = tracks.filter((t) => t.previewUrl).length;

      statements.push(`update public.artist_profiles set
        spotify_artist_id = ${lit(artist.spotifyId)},
        spotify_followers = ${artist.followers},
        spotify_popularity = ${artist.popularity},
        spotify_profile_url = ${artist.url ? lit(artist.url) : 'null'},
        spotify_data = ${lit(JSON.stringify(artist))}::jsonb,
        top_tracks = ${lit(JSON.stringify(tracks))}::jsonb,
        top_tracks_updated_at = now(),
        artist_report = ${lit(JSON.stringify(rep))}::jsonb,
        metrics_updated_at = now()
      where id = ${lit(row.id)};`);

      const entry = {
        name, via, spotify: artist.name,
        followers: artist.followers, popularity: artist.popularity,
        tracks: tracks.length, playable, score: rep.score, label: rep.label,
      };
      (via === 'linked' ? report.enriched : report.matched).push(entry);
      console.log(
        `  ${via === 'linked' ? 'v' : '~'} ${name.padEnd(22)} ${String(artist.followers).padStart(10)} followers  pop ${String(artist.popularity).padStart(3)}  ${playable}/${tracks.length} playable  score ${rep.score}${itunesBlocked ? '  (itunes throttled)' : ''}`,
      );
    } catch (e) {
      report.failed.push({ name, why: e.message });
      console.log(`  x ${name.padEnd(22)} ${e.message}`);
    }

    await sleep(200);
  }

  console.log(
    `\nlinked ${report.enriched.length} · name-matched ${report.matched.length} · mismatch ${report.mismatch.length} · skipped ${report.skipped.length} · failed ${report.failed.length}`,
  );
  if (report.mismatch.length) {
    console.log('\nID MISMATCH — stored spotify_artist_id does not match the profile name. Not written.');
    for (const m of report.mismatch) {
      console.log(`  ${m.name}  (profile ${m.id})`);
      console.log(`    stored id ${m.artistId} = "${m.spotify}" ${compact(m.followers)} followers`);
      console.log(`    -- clear it:  update public.artist_profiles set spotify_artist_id = null where id = '${m.id}';`);
    }
  }
  if (report.skipped.length) {
    console.log('\nskipped:');
    for (const s of report.skipped) console.log(`  - ${s.name}: ${s.why}`);
  }
  if (report.failed.length) {
    console.log('\nfailed:');
    for (const f of report.failed) console.log(`  - ${f.name}: ${f.why}`);
  }

  if (!APPLY) {
    console.log('\nDry run — nothing written. Re-run with --apply.');
    return;
  }
  if (statements.length === 0) {
    console.log('\nNothing to write.');
    return;
  }
  await sql(statements.join('\n'));
  console.log(`\nApplied ${statements.length} updates.`);
})();
