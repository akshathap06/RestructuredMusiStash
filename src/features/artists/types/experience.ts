export type Track = {
  id: string;
  title: string;
  artworkUrl: string;
  audioUrl?: string;
  durationSeconds: number;
  playCount?: number;
};

export type ProjectSummary = {
  id: string;
  title: string;
  artworkUrl: string;
  percentBacked: number;
  fundingGoal: number;
  paperBackingTotal: number;
};

export type Artist = {
  id: string;
  name: string;
  verified: boolean;
  genre: string;
  location: string;
  monthlyListeners: number;
  heroImageUrl: string;
  bio?: string;
  accentColor?: string;
  popularTracks: Track[];
  currentProject?: ProjectSummary;
};

export type Deliverable = {
  id: string;
  label: string;
  icon: 'musical-notes' | 'videocam' | 'mic' | 'megaphone' | 'calendar' | 'globe';
};

export type FundAllocation = {
  id: string;
  label: string;
  amount: number;
  percent: number;
};

export type ProjectMilestone = {
  id: string;
  title: string;
  status: 'planned' | 'done';
  targetLabel?: string;
};

export type ScenarioTarget = {
  weeks: number;
  targetPaperSharePrice: number;
  label: string;
};

export type AIAnalysis = {
  score: number;
  label: string;
  summary: string;
  factors: { label: string; score: number; explanation?: string }[];
  generatedAt?: string;
};

export type Project = {
  id: string;
  artistId: string;
  artistName: string;
  artistVerified: boolean;
  title: string;
  type: string;
  artworkUrl: string;
  heroImageUrl?: string;
  shortDescription: string;
  fullDescription: string;
  fundingGoal: number;
  paperBackingTotal: number;
  paperBackerCount: number;
  daysRemaining: number;
  currentPaperSharePrice: number;
  scenarioTargets: ScenarioTarget[];
  deliverables: Deliverable[];
  useOfFunds: FundAllocation[];
  milestones: ProjectMilestone[];
  timeline: string[];
  risks: string[];
  aiAnalysis: AIAnalysis;
};

export const PAPER_DISCLOSURE_SHORT =
  'SIMULATION ONLY · NO REAL MONEY OR OWNERSHIP';

export const PAPER_DISCLOSURE_BODY =
  'Paper trading simulation only. No real money, securities, ownership, or financial returns are being offered.';
