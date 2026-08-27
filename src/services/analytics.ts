// Lightweight proof-of-concept analytics. Fire-and-forget insert into the
// Supabase `paper_events` table (RLS: users write their own rows). Intentionally
// small — swap for PostHog/Amplitude later without touching callers.

import { supabase } from '../lib/supabase';

type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

async function send(event: string, properties: AnalyticsProps) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await supabase.from('paper_events').insert({
      user_id: session?.user?.id ?? null,
      event,
      props: properties,
    });
  } catch {
    // never let telemetry break a flow
  }
}

export const analytics = {
  track(event: string, properties: AnalyticsProps = {}) {
    if (__DEV__) console.log('[analytics]', event, properties);
    void send(event, properties);
  },
};

export default analytics;
