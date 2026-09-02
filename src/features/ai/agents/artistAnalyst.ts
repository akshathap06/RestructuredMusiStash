import { messageId } from './types';
import type { AgentContext, AgentSession, AgentTurn, ArtistAnalysisResult } from './types';

const BACKEND_URL = 'https://musistash-platform-production-3168.up.railway.app';

const SKIP_WORDS = new Set(['skip', 'no', 'none', 'nope', 'just them', 'solo']);

function splitVersus(input: string): { artist: string; compare?: string } {
  const m = input.split(/\s+(?:vs\.?|versus|compared? to|against)\s+/i);
  if (m.length >= 2 && m[0].trim() && m[1].trim()) {
    return { artist: m[0].trim(), compare: m[1].trim() };
  }
  return { artist: input.trim() };
}

async function analyze(
  artist: string,
  compare: string | undefined,
  signal: AbortSignal | undefined
): Promise<AgentTurn['messages']> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    const base = `${BACKEND_URL}/analyze-artist/${encodeURIComponent(artist)}`;
    const url = compare
      ? `${base}?comparable_artist=${encodeURIComponent(compare)}`
      : base;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({} as any));
      throw new Error(err.detail || `Analysis failed (${res.status})`);
    }

    const result = (await res.json()) as ArtistAnalysisResult;
    if (typeof result?.resonance_score !== 'number') {
      throw new Error('The analysis service returned an unexpected response.');
    }

    return [
      {
        id: messageId(),
        role: 'agent',
        card: { type: 'artist-analysis', data: result },
      },
      {
        id: messageId(),
        role: 'agent',
        text: compare
          ? `That's how ${result.artist?.name || artist} stacks up against ${
              result.similar_artist?.name || compare
            }. Send another name (or "A vs B") to run it again.`
          : 'Send another artist name — or "Artist A vs Artist B" — to run another analysis.',
      },
    ];
  } catch (e: any) {
    const reason =
      e?.name === 'AbortError'
        ? 'that took too long and timed out'
        : e?.message || 'something went wrong';
    return [
      {
        id: messageId(),
        role: 'agent',
        text: `I couldn't finish that one — ${reason}. Try another artist name.`,
      },
    ];
  } finally {
    clearTimeout(timeout);
  }
}

export function initialSession(): AgentSession {
  return { step: 'awaiting_artist', scratch: {} };
}

export async function respond(
  session: AgentSession,
  userText: string,
  ctx: AgentContext
): Promise<AgentTurn> {
  const text = userText.trim();

  if (session.step === 'awaiting_compare') {
    const artist = String(session.scratch.artist || '');
    const compare = SKIP_WORDS.has(text.toLowerCase()) ? undefined : text;
    const messages = await analyze(artist, compare, ctx.signal);
    return { session: initialSession(), messages };
  }

  // awaiting_artist (default)
  const { artist, compare } = splitVersus(text);
  if (!artist) {
    return {
      session,
      messages: [
        { id: messageId(), role: 'agent', text: 'Give me an artist name to analyze.' },
      ],
    };
  }
  if (compare) {
    const messages = await analyze(artist, compare, ctx.signal);
    return { session: initialSession(), messages };
  }
  return {
    session: { step: 'awaiting_compare', scratch: { artist } },
    messages: [
      {
        id: messageId(),
        role: 'agent',
        text: `Want me to benchmark ${artist} against another artist? Send a name, or "skip".`,
        chips: [{ label: 'Skip', value: 'skip' }],
      },
    ],
  };
}
