// Permanent account deletion — the piece the client cannot do itself.
//
// moderationService.deleteUserAccount() clears the caller's rows from the app
// tables it can reach under RLS, then calls this. Here we delete the auth.users
// record with the service-role key, which cascades everything still keyed to it
// (paper_wallets / positions / transactions / watchlist / snapshots,
// notifications, financial_profiles, auth sessions & identities, …).
//
// Required env (auto-injected by Supabase): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'Missing Authorization header' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Resolve the caller from their own token — never trust a uid in the body.
    const asUser = createClient(url, serviceKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await asUser.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Invalid session' }, 401);
    const uid = userData.user.id;

    const admin = createClient(url, serviceKey);

    // Best-effort purge of the few tables that don't cascade from auth.users.
    await admin.from('artist_profiles').delete().eq('user_id', uid);
    await admin.from('users').delete().eq('id', uid);

    // The account itself. Cascades the rest.
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ success: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
