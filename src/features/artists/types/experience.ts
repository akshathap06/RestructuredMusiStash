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

export type Collaboration = {
  id: string;
  name: string;
  role?: string;
  avatarUrl?: string;
};

export type ArtistReport = {
  score: number;
  label: string;
  summary: string;
  factors: { label: string; value: string; detail: string }[];
  generatedAt: string;
};

export type Artist = {
  id: string;
  name: string;
  verified: boolean;
  genre: string;
  location: string;
  /** Typed in by the artist — Spotify does not expose this. */
  monthlyListeners: number;
  totalStreams?: number;
  /** True when monthlyListeners / totalStreams came from the artist, not an API. */
  listenersSelfReported?: boolean;
  spotifyFollowers?: number;
  spotifyPopularity?: number;
  spotifyUrl?: string | null;
  report?: ArtistReport | null;
  heroImageUrl: string;
  bio?: string;
  accentColor?: string;
  popularTracks: Track[];
  collaborations?: Collaboration[];
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

export type ProjectStatus =
  | 'draft'
  | 'funding'
  | 'funded'
  | 'active'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ProjectOutcome =
  | 'funded_settled'
  | 'failed_refund'
  | 'cancelled_refund'
  | null;

export type AIAnalysis = {
  score: number;
  label: string;
  summary: string;
  factors: { label: string; score: number; explanation?: string }[];
  generatedAt?: string;
  // Derived by the pricing/scoring engine (fn_project_scores):
  resonanceScore?: number;
  similarityScore?: number;
  momentumScore?: number;
  riskScore?: number;
  projectedROI?: number;
  confidence?: number;
  explanation?: string;
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
  /** Current MusiStash model price per unit. */
  currentPaperSharePrice: number;
  initialPrice: number;
  settlementPrice?: number | null;
  status: ProjectStatus;
  outcome?: ProjectOutcome;
  termWeeks: number;
  fundingDeadline?: string | null;
  maturityDate?: string | null;
  fundedAt?: string | null;
  totalUnits?: number;
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
  'MusiStash Paper Trading uses simulated currency and simulated project values. No real securities or financial returns are being offered.';
