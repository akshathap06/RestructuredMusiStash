// Centralized project state machine. Status is written ONLY by the Supabase
// RPCs (rpc_invest / rpc_settle_project / rpc_cancel_project / the daily cron).
// The client just reads it and renders.

export type ProjectStatus =
  | 'draft'
  | 'funding'
  | 'funded'
  | 'active'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ProjectOutcome =
  | 'funded_settled'
  | 'failed_refund'
  | 'cancelled_refund'
  | null;

export const TERMINAL_STATUSES: ProjectStatus[] = ['completed', 'failed', 'cancelled'];

export const isTerminal = (s: ProjectStatus): boolean => TERMINAL_STATUSES.includes(s);

/** A project can take new backing while raising or in progress. */
export const canBack = (s: ProjectStatus): boolean =>
  s === 'funding' || s === 'funded' || s === 'active';

/** A held position can be exited early unless the project has already settled. */
export const canExit = (s: ProjectStatus): boolean => !isTerminal(s);

export function statusLabel(s: ProjectStatus): string {
  switch (s) {
    case 'draft': return 'Draft';
    case 'funding': return 'Funding';
    case 'funded': return 'Funded';
    case 'active': return 'In progress';
    case 'completed': return 'Completed';
    case 'failed': return 'Did not fund';
    case 'cancelled': return 'Cancelled';
    default: return s;
  }
}

export type StatusTone = 'accent' | 'positive' | 'negative' | 'muted';

export function statusTone(s: ProjectStatus): StatusTone {
  switch (s) {
    case 'funding':
    case 'funded':
    case 'active':
      return 'accent';
    case 'completed':
      return 'positive';
    case 'failed':
    case 'cancelled':
      return 'negative';
    default:
      return 'muted';
  }
}

export const TIMELINE_STEPS = [
  'Campaign created',
  'Funding opens',
  'Goal reached',
  'Project begins',
  'Production',
  'Release & promotion',
  'Performance tracking',
  'Maturity',
  'Settlement',
] as const;

/** Index into TIMELINE_STEPS that the project has reached. */
export function currentTimelineStep(p: {
  status: ProjectStatus;
  fundedAt?: string | null;
  milestonesDone?: number;
  milestonesTotal?: number;
}): number {
  if (p.status === 'draft') return 0;
  if (p.status === 'funding') return 1;
  if (isTerminal(p.status)) return 8;
  // funded / funded->active
  const doneFrac =
    p.milestonesTotal && p.milestonesTotal > 0
      ? (p.milestonesDone ?? 0) / p.milestonesTotal
      : 0;
  if (doneFrac >= 1) return 7; // maturity
  if (doneFrac >= 0.5) return 5; // release & promotion
  if (doneFrac > 0) return 4; // production
  return 3; // project begins
}
