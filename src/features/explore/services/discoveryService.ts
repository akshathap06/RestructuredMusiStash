import { supabase } from '../../../lib/supabase';

export type DiscoveryProject = {
  id: string;
  title: string;
  type: string;
  status: string;
  artistName: string;
  artistProfileId: string;
  artworkUrl: string | null;
  fundingGoal: number;
  paperBackingTotal: number;
  paperBackerCount: number;
  daysRemaining: number;
  currentPrice: number;
  aiScore: number | null; // = momentum score
  resonanceScore: number | null;
  momentumScore: number | null;
  percent: number; // 0..100
};

export type DiscoveryArtist = {
  id: string;
  name: string;
  genre: string;
  location: string | null;
  monthlyListeners: number;
  avatarUrl: string | null;
  verified: boolean;
};

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

const PROJECT_SELECT =
  'id, title, type, status, artwork_url, funding_goal, paper_backing_total, paper_backer_count, days_remaining, current_paper_share_price, resonance_score, momentum_score, ai_analysis, artist_profile_id, artist_profiles(artist_name, name)';

function mapProject(row: any): DiscoveryProject {
  const goal = num(row.funding_goal);
  const backed = num(row.paper_backing_total);
  const ai = row.ai_analysis;
  const momentum =
    row.momentum_score != null
      ? Number(row.momentum_score)
      : ai && typeof ai.score === 'number'
        ? ai.score
        : null;
  return {
    id: row.id,
    title: row.title,
    type: row.type || 'Project',
    status: row.status || 'funding',
    artistName: row.artist_profiles?.artist_name ?? row.artist_profiles?.name ?? 'Artist',
    artistProfileId: row.artist_profile_id,
    artworkUrl: row.artwork_url ?? null,
    fundingGoal: goal,
    paperBackingTotal: backed,
    paperBackerCount: row.paper_backer_count ?? 0,
    daysRemaining: row.days_remaining ?? 0,
    currentPrice: num(row.current_paper_share_price) || 10,
    aiScore: momentum,
    resonanceScore: row.resonance_score != null ? Number(row.resonance_score) : null,
    momentumScore: momentum,
    percent: goal > 0 ? Math.min(100, Math.round((backed / goal) * 100)) : 0,
  };
}

function mapArtist(row: any): DiscoveryArtist {
  const genre = Array.isArray(row.genre) ? row.genre[0] : row.genre;
  return {
    id: row.id,
    name: (row.artist_name || row.name || 'Artist').toUpperCase(),
    genre: genre || 'Artist',
    location: row.location ?? null,
    monthlyListeners: num(row.monthly_listeners),
    avatarUrl: row.profile_photo_url ?? null,
    verified: !!(row.is_verified || row.status === 'approved'),
  };
}

// Projects that are still open for backing.
const OPEN_STATUSES = ['funding', 'funded', 'active'];

export const discoveryService = {
  /** All open projects, highest backer count first. */
  async getLiveProjects(limit = 24): Promise<DiscoveryProject[]> {
    const { data, error } = await supabase
      .from('artist_projects')
      .select(PROJECT_SELECT)
      .in('status', OPEN_STATUSES)
      .order('paper_backer_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapProject);
  },

  /** The single most-backed open project for the hero card. */
  async getFeaturedProject(): Promise<DiscoveryProject | null> {
    const { data, error } = await supabase
      .from('artist_projects')
      .select(PROJECT_SELECT)
      .in('status', OPEN_STATUSES)
      .order('paper_backing_total', { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    return data && data[0] ? mapProject(data[0]) : null;
  },

  /**
   * Client-side sorted discovery sections from one fetched pool.
   * (Trending / Closing soon / High resonance / High momentum / New / Under $10k)
   */
  sortSection(pool: DiscoveryProject[], section: string): DiscoveryProject[] {
    const list = [...pool];
    switch (section) {
      case 'Trending':
        return list.sort((a, b) => b.paperBackerCount - a.paperBackerCount);
      case 'Closing soon':
        return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
      case 'High resonance':
        return list.sort((a, b) => (b.resonanceScore ?? 0) - (a.resonanceScore ?? 0));
      case 'High momentum':
      case 'Momentum':
        return list.sort((a, b) => (b.momentumScore ?? 0) - (a.momentumScore ?? 0));
      case 'New':
        return list; // pool already newest-first from the query
      case 'Under $10k':
        return list.filter((p) => p.fundingGoal < 10000);
      default:
        return list;
    }
  },

  /** Approved artists, most monthly listeners first. */
  async getRisingArtists(limit = 8): Promise<DiscoveryArtist[]> {
    const { data, error } = await supabase
      .from('artist_profiles')
      .select(
        'id, artist_name, name, genre, location, monthly_listeners, profile_photo_url, is_verified, status',
      )
      .in('status', ['approved', 'active'])
      .order('monthly_listeners', { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapArtist);
  },

  /** Free-text search across live projects + artists (client-side genre filter). */
  async search(
    query: string,
    genre?: string,
  ): Promise<{ projects: DiscoveryProject[]; artists: DiscoveryArtist[] }> {
    const q = query.trim();
    const [projects, artists] = await Promise.all([
      this.getLiveProjects(50),
      this.getRisingArtists(50),
    ]);
    const lc = q.toLowerCase();
    const matchGenre = (g: string) => !genre || genre === 'All' || g === genre;
    return {
      projects: projects.filter(
        (p) =>
          (!q || `${p.title} ${p.artistName} ${p.type}`.toLowerCase().includes(lc)),
      ),
      artists: artists.filter(
        (a) =>
          matchGenre(a.genre) &&
          (!q || `${a.name} ${a.genre} ${a.location ?? ''}`.toLowerCase().includes(lc)),
      ),
    };
  },
};
