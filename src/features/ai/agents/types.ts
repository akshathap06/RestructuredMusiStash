import type { Venue } from '../services/agenticManagerService';

export type BuiltInAgentId = 'artist-analyst' | 'venue-finder' | 'email-generator';

export type ChatRole = 'agent' | 'user';

/** Tappable quick-reply shown beneath an agent message. */
export type ChatChip = { label: string; value: string };

export type ArtistAnalysisResult = {
  artist: {
    name: string;
    avatar?: string;
    genres: string[];
    followers: number;
    popularity?: number;
    market_stats?: {
      monthly_streams_millions?: number;
      youtube_subscribers?: number;
      instagram_followers?: number;
      net_worth_millions?: number;
    };
  };
  similar_artist?: {
    name: string;
    avatar?: string;
    genres: string[];
    followers: number;
    popularity?: number;
  } | null;
  resonance_score: number;
  genre_compatibility: number;
  resonance_explanation: string;
  resonance_details?: {
    commercial_potential?: string;
    musical_similarities?: string[];
  };
};

export type ChatCard =
  | { type: 'artist-analysis'; data: ArtistAnalysisResult }
  | { type: 'venues'; data: Venue[] }
  | { type: 'email-draft'; data: { subject: string; body: string } };

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text?: string;
  card?: ChatCard;
  chips?: ChatChip[];
  /** true while the agent is "thinking" — renders a typing indicator */
  pending?: boolean;
};

/** Per-thread step-machine state owned by an agent module. */
export type AgentSession = {
  step: string;
  scratch: Record<string, unknown>;
};

export type AgentContext = {
  user: any;
  /** open the shared venue detail sheet */
  onOpenVenue: (venue: Venue) => void;
  /** aborted when the user taps stop mid-turn */
  signal?: AbortSignal;
};

export type AgentTurn = {
  session: AgentSession;
  /** agent messages to append to the thread */
  messages: ChatMessage[];
};

let seq = 0;
export function messageId(): string {
  seq += 1;
  return `m${Date.now().toString(36)}_${seq}`;
}

export function agentText(text: string, chips?: ChatChip[]): ChatMessage {
  return { id: messageId(), role: 'agent', text, chips };
}
