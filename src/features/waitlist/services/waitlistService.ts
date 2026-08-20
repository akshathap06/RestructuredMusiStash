import AsyncStorage from '@react-native-async-storage/async-storage';

const WAITLIST_STORAGE_KEY = '@musistash_waitlist_entries';

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

async function getEntries(): Promise<WaitlistEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(WAITLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('waitlistService: failed to read entries', error);
    return [];
  }
}

async function saveEntries(entries: WaitlistEntry[]): Promise<void> {
  await AsyncStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(entries));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
    const entries = await getEntries();
    const alreadyJoined = entries.some(
      (e) =>
        normalizeEmail(e.email) === email ||
        (params.userId && e.userId && e.userId === params.userId)
    );

    if (alreadyJoined) {
      return { success: false, error: 'Already on the waitlist' };
    }

    const now = new Date().toISOString();
    const entry: WaitlistEntry = {
      id: `wl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId: params.userId,
      email,
      role: params.role,
      source: params.source || 'app',
      genres: params.genres,
      expectedAmountOptional: params.expectedAmountOptional,
      interestedInRealMoney: true,
      consentAt: now,
      createdAt: now,
    };

    entries.push(entry);
    await saveEntries(entries);
    return { success: true, entry };
  } catch (error) {
    console.error('waitlistService: joinWaitlist failed', error);
    return { success: false, error: 'Failed to join waitlist' };
  }
}

export async function hasJoined(emailOrUserId: string): Promise<boolean> {
  if (!emailOrUserId?.trim()) return false;

  try {
    const entries = await getEntries();
    const needle = emailOrUserId.trim();
    const emailNeedle = normalizeEmail(needle);

    return entries.some(
      (e) =>
        normalizeEmail(e.email) === emailNeedle ||
        (e.userId != null && e.userId === needle)
    );
  } catch (error) {
    console.error('waitlistService: hasJoined failed', error);
    return false;
  }
}

export async function getWaitlistEntries(): Promise<WaitlistEntry[]> {
  return getEntries();
}

export const waitlistService = {
  joinWaitlist,
  hasJoined,
  getWaitlistEntries,
};

export default waitlistService;
