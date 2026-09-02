import type { Artist, Project } from '../../types/experience';

/**
 * Picks what actually goes on the share card.
 *
 * The artist screen is a long scroll; a card is one glance. This module decides
 * which few things earn the space, and — importantly — only ever selects data
 * we really have. Nothing here is synthesised: a chart is shown only when there
 * is a real series behind it, and stats are omitted rather than guessed, since
 * the card is published to an audience as a statement about the artist.
 */

export type ShareStat = { value: string; label: string };

export type ShareChart =
  | { kind: 'momentum'; points: number[]; deltaPct: number; caption: string }
  | { kind: 'tracks'; bars: { label: string; value: number }[]; caption: string }
  | { kind: 'none' };

export type ShareTrack = { rank: number; title: string; plays?: string };

export type ShareCardModel = {
  name: string;
  verified: boolean;
  subtitle: string;
  artworkUrl: string;
  accent: string;
  stats: ShareStat[];
  chart: ShareChart;
  tracks: ShareTrack[];
  url: string;
  urlLabel: string;
};

const DEFAULT_ACCENT = '#4B9CD3';

/** 1_240_000 -> "1.2M". Used for both stat tiles and play counts. */
export function compact(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1_000_000_000) return `${trim(n / 1_000_000_000)}B`;
  if (n >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `${trim(n / 1_000)}K`;
  return String(Math.round(n));
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

/** Even-spaced sample so a long series still reads as a shape at card size. */
function resample(values: number[], count: number): number[] {
  if (values.length <= count) return values;
  const step = (values.length - 1) / (count - 1);
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(values[Math.round(i * step)]);
  return out;
}

export function buildShareCardModel(params: {
  artist: Artist;
  projects?: Project[];
  priceHistory?: { t: number; v: number }[];
}): ShareCardModel {
  const { artist, projects = [], priceHistory = [] } = params;

  // --- stats: the two or three headline numbers we actually hold ----------
  const stats: ShareStat[] = [];
  if (artist.monthlyListeners > 0) {
    stats.push({ value: compact(artist.monthlyListeners), label: 'Listeners' });
  }
  if (artist.totalStreams && artist.totalStreams > 0) {
    stats.push({ value: compact(artist.totalStreams), label: 'Streams' });
  }

  const liveProject = projects.find((p) =>
    ['funding', 'funded', 'active'].includes(p.status),
  );
  if (liveProject && liveProject.paperBackerCount > 0 && stats.length < 3) {
    stats.push({ value: compact(liveProject.paperBackerCount), label: 'Backers' });
  }
  if (stats.length === 0) {
    stats.push({ value: String(artist.popularTracks.length), label: 'Releases' });
  }

  // --- chart: real series only, best one wins -----------------------------
  const chart = pickChart(artist, liveProject, priceHistory);

  // --- tracks: top three by play count, else running order ----------------
  const tracks: ShareTrack[] = [...artist.popularTracks]
    .sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0))
    .slice(0, 3)
    .map((t, i) => ({
      rank: i + 1,
      title: t.title,
      plays: t.playCount ? compact(t.playCount) : undefined,
    }));

  const subtitleParts = [artist.genre, artist.location].filter(
    (p) => p && p !== '—',
  );

  return {
    name: artist.name,
    verified: artist.verified,
    subtitle: subtitleParts.join(' · '),
    artworkUrl: artist.heroImageUrl,
    accent: artist.accentColor || DEFAULT_ACCENT,
    stats: stats.slice(0, 3),
    chart,
    tracks,
    url: `https://musistash.com/artist/${artist.id}`,
    urlLabel: 'musistash.com',
  };
}

function pickChart(
  artist: Artist,
  liveProject: Project | undefined,
  priceHistory: { t: number; v: number }[],
): ShareChart {
  // 1. A funded project's model-price history is a genuine time series.
  if (liveProject && priceHistory.length >= 4) {
    const values = resample(
      priceHistory.map((p) => p.v),
      24,
    );
    const first = values[0];
    const last = values[values.length - 1];
    const deltaPct = first > 0 ? ((last - first) / first) * 100 : 0;
    return {
      kind: 'momentum',
      points: values,
      deltaPct,
      caption: liveProject.title,
    };
  }

  // 2. Otherwise compare the top tracks against each other — also real data.
  const withPlays = artist.popularTracks.filter((t) => (t.playCount ?? 0) > 0);
  if (withPlays.length >= 3) {
    return {
      kind: 'tracks',
      bars: withPlays
        .sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0))
        .slice(0, 7)
        .map((t) => ({ label: t.title, value: t.playCount ?? 0 })),
      caption: 'Top tracks',
    };
  }

  // 3. Nothing real to plot — the card drops the block rather than invent one.
  return { kind: 'none' };
}
