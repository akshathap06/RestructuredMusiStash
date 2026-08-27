// "Paper Mobile" palette (mirror of src/styles/theme.ts colors).
export const colors = {
  background: '#0A0A0C',
  surface: '#15151A',
  surfaceElevated: '#1D1D24',
  line: '#26262D',
  listDivider: '#1A1A20',
  borderSubtle: 'rgba(255,255,255,0.08)',
  textPrimary: '#F4F4F6',
  textSecondary: '#C9C6D4',
  textMuted: '#9B9BA4',
  textFaint: '#6A6A74',
  accent: '#4B9CD3',
  accentSolid: '#8ECDF0',
  accentTint: 'rgba(75,156,211,0.14)',
  onAccent: '#0A0A0C',
  positive: '#8ECDF0',
  negative: '#FF6A5E',
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
