import { agenticManagerService, type Venue } from '../services/agenticManagerService';
import { messageId } from './types';
import type { AgentContext, AgentSession, AgentTurn } from './types';

export function initialSession(): AgentSession {
  return { step: 'awaiting_query', scratch: {} };
}

/** "Atlanta, alternative R&B" -> { location: "Atlanta", genre: "alternative R&B" } */
function parseQuery(input: string): { location: string; genre?: string } {
  const parts = input.split(/[,\n]|\s+-\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { location: input.trim() };
  const [location, ...rest] = parts;
  const genre = rest.join(', ').trim();
  return { location, genre: genre || undefined };
}

export async function respond(
  session: AgentSession,
  userText: string,
  ctx: AgentContext
): Promise<AgentTurn> {
  const { location, genre } = parseQuery(userText);

  if (!location) {
    return {
      session,
      messages: [
        {
          id: messageId(),
          role: 'agent',
          text: 'Tell me a city or region to search — for example "Nashville" or "Nashville, indie folk".',
        },
      ],
    };
  }

  let venues: Venue[] = [];
  try {
    venues = await agenticManagerService.discoverVenues({
      location,
      artistGenre: genre,
    });
  } catch {
    venues = [];
  }

  // User tapped stop while the request was in flight.
  if (ctx.signal?.aborted) return { session, messages: [] };

  if (!venues.length) {
    return {
      session,
      messages: [
        {
          id: messageId(),
          role: 'agent',
          text: `I couldn't pull any venues for "${location}"${
            genre ? ` (${genre})` : ''
          }. Double-check the spelling or try a nearby city.`,
        },
      ],
    };
  }

  const top = venues.slice(0, 6);
  return {
    session,
    messages: [
      {
        id: messageId(),
        role: 'agent',
        text: `Here ${top.length === 1 ? 'is' : 'are'} ${top.length} venue${
          top.length === 1 ? '' : 's'
        } in ${location}${genre ? ` for ${genre}` : ''}. Tap one for details, or send another city.`,
      },
      {
        id: messageId(),
        role: 'agent',
        card: { type: 'venues', data: top },
      },
    ],
  };
}
