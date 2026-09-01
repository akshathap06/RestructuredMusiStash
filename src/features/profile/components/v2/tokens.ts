export const colors = {
  background: '#080A0D',
  surface: '#101318',
  surfaceElevated: '#151920',
  borderSubtle: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.16)',
  textPrimary: '#F5F3EF',
  textSecondary: '#AAA8AE',
  textMuted: '#73717A',
  accent: '#8B5CF6',
  positive: '#62D892',
  negative: '#EF4444',
} as const;

// Shared layout scale for the profile V2 surface.
export const radius = {
  card: 14,
  pill: 999,
} as const;

export const space = {
  section: 28,
  block: 16,
} as const;

export function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}$${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  }
  return `${Math.round(value)}`;
}
