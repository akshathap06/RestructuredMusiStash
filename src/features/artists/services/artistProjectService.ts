import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Deliverable,
  Project,
  ScenarioTarget,
} from '../types/experience';
import { kalebProject, KALEB_PROJECT_ID } from '../data/kalebDemo';

const INDEX_KEY = '@ms/paper_projects_index';
const artistKey = (artistId: string) => `@ms/paper_projects_artist_${artistId}`;

export type CreateProjectInput = {
  artistId: string;
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

function makeId(): string {
  return `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
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
  async listForArtist(artistId: string): Promise<Project[]> {
    const list = await readJson<Project[]>(artistKey(artistId), []);
    return list;
  },

  async getById(projectId: string): Promise<Project | null> {
    if (projectId === KALEB_PROJECT_ID) return { ...kalebProject };
    const index = await readJson<Record<string, string>>(INDEX_KEY, {});
    const artistId = index[projectId];
    if (!artistId) return null;
    const list = await this.listForArtist(artistId);
    return list.find((p) => p.id === projectId) || null;
  },

  async create(input: CreateProjectInput): Promise<Project> {
    const share = input.currentPaperSharePrice ?? 10;
    const project: Project & { statusLive?: boolean } = {
      id: makeId(),
      artistId: input.artistId,
      artistName: input.artistName,
      artistVerified: !!input.artistVerified,
      title: input.title.trim().toUpperCase(),
      type: input.type.trim() || 'Project',
      artworkUrl:
        input.artworkUrl ||
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
      heroImageUrl: input.heroImageUrl || input.artworkUrl,
      shortDescription: input.shortDescription.trim(),
      fullDescription:
        input.fullDescription?.trim() ||
        `${input.shortDescription.trim()}\n\nPaper trading simulation only. No real money, securities, ownership, or financial returns are being offered.`,
      fundingGoal: Math.max(100, input.fundingGoal),
      paperBackingTotal: 0,
      paperBackerCount: 0,
      daysRemaining: input.daysRemaining ?? 30,
      currentPaperSharePrice: share,
      scenarioTargets: defaultScenarios(share),
      deliverables: input.deliverables?.length ? input.deliverables : defaultDeliverables,
      useOfFunds: [
        { id: 'f1', label: 'Recording', amount: Math.round(input.fundingGoal * 0.3), percent: 30 },
        { id: 'f2', label: 'Mixing', amount: Math.round(input.fundingGoal * 0.2), percent: 20 },
        { id: 'f3', label: 'Marketing', amount: Math.round(input.fundingGoal * 0.25), percent: 25 },
        { id: 'f4', label: 'Visuals & ops', amount: Math.round(input.fundingGoal * 0.25), percent: 25 },
      ],
      milestones: [
        { id: 'm1', title: 'Project live', status: 'done', targetLabel: 'Now' },
        { id: 'm2', title: 'Mid-campaign update', status: 'planned', targetLabel: 'Week 4' },
        { id: 'm3', title: 'Release', status: 'planned', targetLabel: 'Week 12' },
      ],
      timeline: ['Launch', 'Create & promote', 'Release & wrap'],
      risks: [
        'Simulated values can move up or down.',
        'No ownership or securities are conveyed by paper backing.',
      ],
      aiAnalysis: {
        score: 72,
        label: 'Building',
        summary: 'New project — scores will update as engagement grows.',
        factors: [
          { label: 'Project clarity', score: 80 },
          { label: 'Audience base', score: 70 },
          { label: 'Engagement', score: 65 },
        ],
      },
      statusLive: true,
    };

    const list = await this.listForArtist(input.artistId);
    list.unshift(project);
    await writeJson(artistKey(input.artistId), list);

    const index = await readJson<Record<string, string>>(INDEX_KEY, {});
    index[project.id] = input.artistId;
    await writeJson(INDEX_KEY, index);

    return project;
  },

  async updateBacking(
    projectId: string,
    deltaAmount: number,
    incrementBacker: boolean,
  ): Promise<Project | null> {
    const project = await this.getById(projectId);
    if (!project) return null;
    if (projectId === KALEB_PROJECT_ID) {
      // Demo project stays in memory only for session; skip persist
      return {
        ...project,
        paperBackingTotal: project.paperBackingTotal + deltaAmount,
        paperBackerCount: project.paperBackerCount + (incrementBacker ? 1 : 0),
      };
    }
    const list = await this.listForArtist(project.artistId);
    const idx = list.findIndex((p) => p.id === projectId);
    if (idx < 0) return null;
    list[idx] = {
      ...list[idx],
      paperBackingTotal: list[idx].paperBackingTotal + deltaAmount,
      paperBackerCount: list[idx].paperBackerCount + (incrementBacker ? 1 : 0),
    };
    await writeJson(artistKey(project.artistId), list);
    return list[idx];
  },
};
