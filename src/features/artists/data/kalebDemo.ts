import type { Artist, Project } from '../types/experience';

const ART = {
  hero: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80',
  cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
  studio: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&q=80',
  track: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
};

export const KALEB_PROJECT_ID = 'project_midnight_static';
export const KALEB_ARTIST_ID = 'artist_kaleb';

export const kalebProject: Project = {
  id: KALEB_PROJECT_ID,
  artistId: KALEB_ARTIST_ID,
  artistName: 'KALEB',
  artistVerified: true,
  title: 'MIDNIGHT STATIC',
  type: 'EP + Visual Campaign',
  artworkUrl: ART.cover,
  heroImageUrl: ART.studio,
  shortDescription:
    'A five-track EP blending late-night R&B, alt, and cinematic soul.',
  fullDescription:
    'MIDNIGHT STATIC is a late-night soundtrack for overthinkers and dreamers. An immersive EP paired with visuals and a live launch show in Atlanta. This page is a paper-trading simulation for demand discovery — not a real investment offering.',
  fundingGoal: 10000,
  paperBackingTotal: 7850,
  paperBackerCount: 342,
  daysRemaining: 18,
  currentPaperSharePrice: 10,
  scenarioTargets: [
    { weeks: 4, targetPaperSharePrice: 10.8, label: '4 weeks' },
    { weeks: 12, targetPaperSharePrice: 12.8, label: '12 weeks' },
    { weeks: 24, targetPaperSharePrice: 14.2, label: '24 weeks' },
  ],
  deliverables: [
    { id: 'd1', label: '5-track EP', icon: 'musical-notes' },
    { id: 'd2', label: '2 visuals', icon: 'videocam' },
    { id: 'd3', label: 'Launch show', icon: 'mic' },
  ],
  useOfFunds: [
    { id: 'f1', label: 'Studio recording', amount: 3000, percent: 30 },
    { id: 'f2', label: 'Mixing & mastering', amount: 2000, percent: 20 },
    { id: 'f3', label: 'Marketing', amount: 2000, percent: 20 },
    { id: 'f4', label: 'Music video', amount: 1500, percent: 15 },
    { id: 'f5', label: 'Distribution & ops', amount: 1500, percent: 15 },
  ],
  milestones: [
    { id: 'm1', title: 'Tracking complete', status: 'done', targetLabel: 'Week 2' },
    { id: 'm2', title: 'Mix lock', status: 'planned', targetLabel: 'Week 6' },
    { id: 'm3', title: 'Visuals drop', status: 'planned', targetLabel: 'Week 10' },
    { id: 'm4', title: 'Atlanta launch show', status: 'planned', targetLabel: 'Week 12' },
  ],
  timeline: [
    'Weeks 1–3: Record & arrange',
    'Weeks 4–6: Mix, master, artwork',
    'Weeks 7–10: Visuals + campaign',
    'Weeks 11–12: Release + launch show',
  ],
  risks: [
    'Simulated values can move up or down based on engagement signals.',
    'Creative timelines may slip; milestones are illustrative.',
    'No ownership, royalties, or securities are conveyed by paper backing.',
  ],
  aiAnalysis: {
    score: 87,
    label: 'Strong',
    summary: 'Momentum is led by listener growth and engagement.',
    factors: [
      { label: 'Audience growth', score: 88, explanation: '+18.4% recent listener growth (illustrative).' },
      { label: 'Engagement', score: 87, explanation: 'Saves and replays above peer baseline.' },
      { label: 'Release consistency', score: 84, explanation: 'Steady content cadence over 90 days.' },
      { label: 'Project clarity', score: 90, explanation: 'Clear deliverables and use-of-funds plan.' },
    ],
    generatedAt: '2026-08-01',
  },
};

export const kalebArtist: Artist = {
  id: KALEB_ARTIST_ID,
  name: 'KALEB',
  verified: true,
  genre: 'Alternative R&B',
  location: 'Atlanta, GA',
  monthlyListeners: 248000,
  totalStreams: 4820000,
  heroImageUrl: ART.hero,
  bio: 'Music for the hours when the city is quiet and your thoughts aren’t.',
  accentColor: '#8B5CF6',
  collaborations: [
    { id: 'c1', name: 'NOVA', role: 'Producer', avatarUrl: ART.track },
    { id: 'c2', name: 'J. REYES', role: 'Featured vocals', avatarUrl: ART.studio },
    { id: 'c3', name: 'LATE BLOOM', role: 'Co-writer', avatarUrl: ART.cover },
  ],
  popularTracks: [
    {
      id: 't1',
      title: 'MIDNIGHT STATIC',
      artworkUrl: ART.cover,
      durationSeconds: 222,
      playCount: 1240000,
    },
    {
      id: 't2',
      title: 'AFTER HOURS',
      artworkUrl: ART.track,
      durationSeconds: 198,
      playCount: 890000,
    },
    {
      id: 't3',
      title: 'CITY LIGHTS FADE',
      artworkUrl: ART.studio,
      durationSeconds: 247,
      playCount: 640000,
    },
  ],
  currentProject: {
    id: KALEB_PROJECT_ID,
    title: 'MIDNIGHT STATIC',
    artworkUrl: ART.cover,
    percentBacked: 78.5,
    fundingGoal: 10000,
    paperBackingTotal: 7850,
  },
};

export function formatListeners(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatMoney(n: number, wholeIfClean = true): string {
  const rounded = Math.round(n * 100) / 100;
  if (wholeIfClean && Number.isInteger(rounded)) {
    return `$${rounded.toLocaleString()}`;
  }
  return `$${rounded.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function calcIllustrativeValue(
  paperAmount: number,
  sharePrice: number,
  targetPrice: number,
): number {
  if (sharePrice <= 0) return 0;
  const shares = paperAmount / sharePrice;
  return Math.round(shares * targetPrice * 100) / 100;
}
