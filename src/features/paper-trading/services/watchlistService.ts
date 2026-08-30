import { supabase } from '../../../lib/supabase';
import { analytics } from '../../../services/analytics';
import type { DiscoveryProject } from '../../explore/services/discoveryService';

/**
 * Saved / watchlisted projects. Backed by `public.paper_watchlist`
 * (composite PK (user_id, project_id), RLS `auth.uid() = user_id`).
 * Simulation only — this is a bookmark list, nothing is bought.
 */
export type WatchlistProject = DiscoveryProject & {
  initialPrice: number;
  /** % change of model price vs the project's starting price. */
  changePctVsStart: number;
  watchedAt: string;
};

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

const ROW_SELECT =
  'project_id, created_at, artist_projects(id, title, type, status, artwork_url, funding_goal, paper_backing_total, paper_backer_count, days_remaining, current_paper_share_price, initial_price, resonance_score, momentum_score, ai_analysis, artist_profile_id, artist_profiles(artist_name, name))';

function mapRow(row: any): WatchlistProject | null {
  const p = row.artist_projects;
  if (!p) return null;
  const goal = num(p.funding_goal);
  const backed = num(p.paper_backing_total);
  const ai = p.ai_analysis;
  const momentum =
    p.momentum_score != null
      ? Number(p.momentum_score)
      : ai && typeof ai.score === 'number'
        ? ai.score
        : null;
  const current = num(p.current_paper_share_price) || 10;
  const initial = num(p.initial_price) || current;
  return {
    id: p.id,
    title: p.title,
    type: p.type || 'Project',
    status: p.status || 'funding',
    artistName: p.artist_profiles?.artist_name ?? p.artist_profiles?.name ?? 'Artist',
    artistProfileId: p.artist_profile_id,
    artworkUrl: p.artwork_url ?? null,
    fundingGoal: goal,
    paperBackingTotal: backed,
    paperBackerCount: p.paper_backer_count ?? 0,
    daysRemaining: p.days_remaining ?? 0,
    currentPrice: current,
    aiScore: momentum,
    resonanceScore: p.resonance_score != null ? Number(p.resonance_score) : null,
    momentumScore: momentum,
    percent: goal > 0 ? Math.min(100, Math.round((backed / goal) * 100)) : 0,
    initialPrice: initial,
    changePctVsStart:
      initial > 0 ? Math.round(((current - initial) / initial) * 1000) / 10 : 0,
    watchedAt: row.created_at,
  };
}

async function uid(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  return user.id;
}

export const watchlistService = {
  /** Saved projects, most-recently-added first. */
  async list(): Promise<WatchlistProject[]> {
    const userId = await uid();
    const { data, error } = await supabase
      .from('paper_watchlist')
      .select(ROW_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRow).filter((x): x is WatchlistProject => x != null);
  },

  /** Set of saved project ids — for lighting up bookmark buttons in lists. */
  async ids(): Promise<Set<string>> {
    const userId = await uid();
    const { data, error } = await supabase
      .from('paper_watchlist')
      .select('project_id')
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return new Set((data ?? []).map((r: any) => r.project_id as string));
  },

  async isWatched(projectId: string): Promise<boolean> {
    const userId = await uid();
    const { data, error } = await supabase
      .from('paper_watchlist')
      .select('project_id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return !!data;
  },

  async add(projectId: string): Promise<void> {
    const userId = await uid();
    const { error } = await supabase
      .from('paper_watchlist')
      .upsert({ user_id: userId, project_id: projectId }, { onConflict: 'user_id,project_id' });
    if (error && error.code !== '23505') throw new Error(error.message);
    analytics.track('project_watch', { project_id: projectId });
  },

  async remove(projectId: string): Promise<void> {
    const userId = await uid();
    const { error } = await supabase
      .from('paper_watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId);
    if (error) throw new Error(error.message);
    analytics.track('project_unwatch', { project_id: projectId });
  },

  /** Flip saved state; resolves to the new state (true = now saved). */
  async toggle(projectId: string): Promise<boolean> {
    const watched = await this.isWatched(projectId);
    if (watched) {
      await this.remove(projectId);
      return false;
    }
    await this.add(projectId);
    return true;
  },
};

export default watchlistService;
