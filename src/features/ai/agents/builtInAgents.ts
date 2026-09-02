import type { BuiltInAgentId } from './types';

export type BuiltInAgent = {
  id: BuiltInAgentId;
  name: string;
  tagline: string;
  /** First message the agent posts when a fresh thread opens. */
  intro: string;
  icon: string; // Ionicons name
  gradient: [string, string];
};

export const BUILT_IN_AGENTS: BuiltInAgent[] = [
  {
    id: 'artist-analyst',
    name: 'Artist Analyst',
    tagline: 'Market potential & similar-artist benchmarking',
    intro:
      "Hey — I'm the Artist Analyst. Give me any artist's name and I'll pull their audience size, streaming and social reach, and a resonance score. Add a second artist and I'll benchmark the two against each other.\n\nWhich artist should I look at? (You can also say \"Artist A vs Artist B\".)",
    icon: 'analytics',
    gradient: ['#3B82F6', '#8B5CF6'],
  },
  {
    id: 'venue-finder',
    name: 'Venue Finder',
    tagline: 'Discover venues that fit your sound',
    intro:
      "I'm the Venue Finder. Tell me a city and, if you want, your genre — like \"Atlanta\" or \"Atlanta, alternative R&B\" — and I'll surface venues with capacity, ratings, and how hard they are to book.\n\nWhere are you looking to play?",
    icon: 'location',
    gradient: ['#3B82F6', '#06B6D4'],
  },
  {
    id: 'email-generator',
    name: 'Email Generator',
    tagline: 'Draft pitch emails for venues & promoters',
    intro:
      "I'm the Email Generator. I'll walk you through a few quick questions and hand back a ready-to-send pitch email.\n\nWho are you reaching out to? (venue, promoter, or contact name)",
    icon: 'mail',
    gradient: ['#8B5CF6', '#EC4899'],
  },
];

export function getBuiltInAgent(id: string): BuiltInAgent | undefined {
  return BUILT_IN_AGENTS.find((a) => a.id === id);
}
