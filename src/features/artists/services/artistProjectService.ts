import { supabase } from '../../../lib/supabase';
import type {
  AIAnalysis,
  Deliverable,
  FundAllocation,
  Project,
  ProjectMilestone,
  ScenarioTarget,
} from '../types/experience';

export type CreateProjectInput = {
  artistId: string; // artist_profiles.id
  artistName: string;
  artistVerified?: boolean;
  title: string;
  type: string;
  shortDescription: string;
  fullDescription?: string;
  fundingGoal: number;
  currentPaperSharePrice?: number;
  artworkUrl?: string;
  heroImageUrl?: string;
  deliverables?: Deliverable[];
  daysRemaining?: number;
};

const PROJECT_SELECT =
  '*, artist_profiles(artist_name, name, is_verified, status)';

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

type ProjectRow = {
  id: string;
  artist_profile_id: string;
  title: string;
  type: string;
  short_description: string | null;
  full_description: string | null;
  artwork_url: string | null;
  hero_image_url: string | null;
  funding_goal: number | string;
  paper_backing_total: number | string;
  paper_backer_count: number;
  current_paper_share_price: number | string;
  days_remaining: number | null;
  status: string;
  use_of_funds: unknown;
  milestones: unknown;
  deliverables: unknown;
  scenario_targets: unknown;
  timeline: unknown;
  risks: unknown;
  ai_analysis: unknown;
  artist_profiles?: {
    artist_name: string | null;
    name: string | null;
    is_verified: boolean | null;
    status: string | null;
  } | null;
};

const DEFAULT_ART =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80';

function mapProject(row: ProjectRow): Project {
  const ap = row.artist_profiles ?? null;
  return {
    id: row.id,
    artistId: row.artist_profile_id,
    artistName: ap?.artist_name ?? ap?.name ?? 'Artist',
    artistVerified: !!(ap?.is_verified || ap?.status === 'approved'),
    title: row.title,
    type: row.type || 'Project',
    artworkUrl: row.artwork_url || DEFAULT_ART,
    heroImageUrl: row.hero_image_url || row.artwork_url || undefined,
    shortDescription: row.short_description ?? '',
    fullDescription: row.full_description ?? row.short_description ?? '',
    fundingGoal: num(row.funding_goal),
    paperBackingTotal: num(row.paper_backing_total),
    paperBackerCount: row.paper_backer_count ?? 0,
    daysRemaining: row.days_remaining ?? 0,
    currentPaperSharePrice: num(row.current_paper_share_price) || 10,
    scenarioTargets: arr<ScenarioTarget>(row.scenario_targets),
    deliverables: arr<Deliverable>(row.deliverables),
    useOfFunds: arr<FundAllocation>(row.use_of_funds),
    milestones: arr<ProjectMilestone>(row.milestones),
    timeline: arr<string>(row.timeline),
    risks: arr<string>(row.risks),
    aiAnalysis: (row.ai_analysis as AIAnalysis) ?? {
      score: 0,
      label: 'Pending',
      summary: 'Analysis will appear as engagement grows.',
      factors: [],
    },
  };
}

const defaultScenarios = (share: number): ScenarioTarget[] => [
  { weeks: 4, targetPaperSharePrice: Math.round(share * 1.08 * 100) / 100, label: '4 weeks' },
  { weeks: 12, targetPaperSharePrice: Math.round(share * 1.28 * 100) / 100, label: '12 weeks' },
  { weeks: 24, targetPaperSharePrice: Math.round(share * 1.42 * 100) / 100, label: '24 weeks' },
];

const defaultDeliverables: Deliverable[] = [
  { id: 'd1', label: 'Release', icon: 'musical-notes' },
  { id: 'd2', label: 'Visuals', icon: 'videocam' },
  { id: 'd3', label: 'Campaign', icon: 'megaphone' },
];

export const artistProjectService = {
  async listForArtist(artistProfileId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from('artist_projects')
      .select(PROJECT_SELECT)
      .eq('artist_profile_id', artistProfileId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as ProjectRow[] | null)?.map(mapProject) ?? [];
  },

  async getById(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('artist_projects')
      .select(PROJECT_SELECT)
      .eq('id', projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapProject(data as ProjectRow) : null;
  },

  async create(input: CreateProjectInput): Promise<Project> {
    const share = input.currentPaperSharePrice ?? 10;
    const goal = Math.max(100, input.fundingGoal);
    const short = input.shortDescription.trim();

    const payload = {
      artist_profile_id: input.artistId,
      title: input.title.trim().toUpperCase(),
      type: input.type.trim() || 'Project',
      short_description: short,
      full_description:
        input.fullDescription?.trim() ||
        `${short}\n\nPaper trading simulation only. No real money, securities, ownership, or financial returns are being offered.`,
      artwork_url: input.artworkUrl || DEFAULT_ART,
      hero_image_url: input.heroImageUrl || input.artworkUrl || DEFAULT_ART,
      funding_goal: goal,
      current_paper_share_price: share,
      days_remaining: input.daysRemaining ?? 30,
      status: 'live',
      use_of_funds: [
        { id: 'f1', label: 'Recording', amount: Math.round(goal * 0.3), percent: 30 },
        { id: 'f2', label: 'Mixing', amount: Math.round(goal * 0.2), percent: 20 },
        { id: 'f3', label: 'Marketing', amount: Math.round(goal * 0.25), percent: 25 },
        { id: 'f4', label: 'Visuals & ops', amount: Math.round(goal * 0.25), percent: 25 },
      ] satisfies FundAllocation[],
      milestones: [
        { id: 'm1', title: 'Project live', status: 'done', targetLabel: 'Now' },
        { id: 'm2', title: 'Mid-campaign update', status: 'planned', targetLabel: 'Week 4' },
        { id: 'm3', title: 'Release', status: 'planned', targetLabel: 'Week 12' },
      ] satisfies ProjectMilestone[],
      deliverables: input.deliverables?.length ? input.deliverables : defaultDeliverables,
      scenario_targets: defaultScenarios(share),
      timeline: ['Launch', 'Create & promote', 'Release & wrap'],
      risks: [
        'Simulated values can move up or down.',
        'No ownership or securities are conveyed by paper backing.',
      ],
      ai_analysis: {
        score: 72,
        label: 'Building',
        summary: 'New project — scores will update as engagement grows.',
        factors: [
          { label: 'Project clarity', score: 80 },
          { label: 'Audience base', score: 70 },
          { label: 'Engagement', score: 65 },
        ],
      } satisfies AIAnalysis,
    };

    const { data, error } = await supabase
      .from('artist_projects')
      .insert(payload)
      .select(PROJECT_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return mapProject(data as ProjectRow);
  },

  /**
   * @deprecated Backing totals are maintained atomically inside
   * `rpc_open_paper_position`. Kept for call-site compatibility; just re-reads.
   */
  async updateBacking(
    projectId: string,
    _deltaAmount: number,
    _incrementBacker: boolean,
  ): Promise<Project | null> {
    return this.getById(projectId);
  },
};
