import { supabase } from '../../../lib/supabase';

export type WaitlistRole = 'fan' | 'artist';

export interface WaitlistEntry {
  id: string;
  userId?: string;
  email: string;
  role: WaitlistRole;
  source: string;
  genres?: string[];
  expectedAmountOptional?: number;
  interestedInRealMoney: boolean;
  consentAt: string;
  createdAt: string;
}

export interface JoinWaitlistParams {
  userId?: string;
  email: string;
  role: WaitlistRole;
  source: string;
  genres?: string[];
  expectedAmountOptional?: number;
}

type WaitlistRow = {
  id: string;
  user_id: string | null;
  email: string;
  role: string;
  source: string | null;
  genres: string[] | null;
  expected_amount: number | string | null;
  interested_real_money: boolean | null;
  consent_at: string | null;
  created_at: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapEntry(row: WaitlistRow): WaitlistEntry {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    email: row.email,
    role: (row.role === 'artist' ? 'artist' : 'fan') as WaitlistRole,
    source: row.source ?? 'app',
    genres: row.genres ?? undefined,
    expectedAmountOptional:
      row.expected_amount != null ? Number(row.expected_amount) : undefined,
    interestedInRealMoney: row.interested_real_money ?? true,
    consentAt: row.consent_at ?? row.created_at,
    createdAt: row.created_at,
  };
}

export async function joinWaitlist(
  params: JoinWaitlistParams
): Promise<{ success: boolean; entry?: WaitlistEntry; error?: string }> {
  const email = normalizeEmail(params.email);
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Valid email is required' };
  }
  if (params.role !== 'fan' && params.role !== 'artist') {
    return { success: false, error: 'Role must be fan or artist' };
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('waitlist_entries')
      .insert({
        user_id: params.userId ?? session?.user?.id ?? null,
        email,
        role: params.role,
        source: params.source || 'app',
        genres: params.genres ?? [],
        expected_amount: params.expectedAmountOptional ?? null,
        interested_real_money: true,
        consent_at: now,
      })
      .select('*')
      .single();

    if (error) {
      // 23505 = unique_violation on the email column.
      if (error.code === '23505') {
        return { success: false, error: 'Already on the waitlist' };
      }
      return { success: false, error: error.message || 'Failed to join waitlist' };
    }

    return { success: true, entry: mapEntry(data as WaitlistRow) };
  } catch (err) {
    console.error('waitlistService: joinWaitlist failed', err);
    return { success: false, error: 'Failed to join waitlist' };
  }
}

export async function hasJoined(emailOrUserId: string): Promise<boolean> {
  const needle = emailOrUserId?.trim();
  if (!needle) return false;

  try {
    if (needle.includes('@')) {
      const { data, error } = await supabase.rpc('rpc_waitlist_has_email', {
        p_email: needle,
      });
      if (error) throw error;
      return !!data;
    }

    // Treat as a user id — RLS (waitlist_read_own) scopes this to the caller.
    const { data, error } = await supabase
      .from('waitlist_entries')
      .select('id')
      .eq('user_id', needle)
      .limit(1);
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  } catch (err) {
    console.error('waitlistService: hasJoined failed', err);
    return false;
  }
}

export async function getWaitlistEntries(): Promise<WaitlistEntry[]> {
  // RLS limits this to the caller's own rows.
  const { data, error } = await supabase
    .from('waitlist_entries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('waitlistService: getWaitlistEntries failed', error);
    return [];
  }
  return (data as WaitlistRow[] | null)?.map(mapEntry) ?? [];
}

export const waitlistService = {
  joinWaitlist,
  hasJoined,
  getWaitlistEntries,
};

export default waitlistService;
