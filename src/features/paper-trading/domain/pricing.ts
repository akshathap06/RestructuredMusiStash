// Client mirror of the Supabase pricing engine (fn_project_model_price) for
// preview only — the RPCs remain authoritative for anything that touches money.
// Also the single home for position P&L math so every screen agrees.

export const EXIT_SPREAD = 0.02; // early-exit haircut vs. current model price
export const FAILED_REFUND_RATE = 0.9;
export const CANCEL_REFUND_RATE = 1.0;

export type FairValueInputs = {
  initialPrice: number; // base, usually 10
  fundingGoal: number;
  amountRaised: number;
  momentumScore?: number | null; // 0..100
  milestonesDone?: number;
  milestonesTotal?: number;
  /** scenario price for the elapsed term fraction; omit while still funding */
  scenarioPrice?: number | null;
};

/**
 * Deterministic fair value per unit, WITHOUT the daily noise term (preview).
 * Mirrors: base * demand * momentum * milestones * scenario.
 */
export function calculateProjectFairValue(i: FairValueInputs): number {
  const base = i.initialPrice > 0 ? i.initialPrice : 10;
  const progress = Math.min(
    i.fundingGoal > 0 ? i.amountRaised / i.fundingGoal : 0,
    1.5,
  );
  const momentum = i.momentumScore ?? 50;
  const msFrac =
    i.milestonesTotal && i.milestonesTotal > 0
      ? (i.milestonesDone ?? 0) / i.milestonesTotal
      : 0;

  const demandMult = 1 + 0.35 * progress;
  const momentumMult = 1 + 0.3 * ((momentum - 50) / 50);
  const milestoneMult = 1 + 0.15 * msFrac;
  const scenarioMult =
    i.scenarioPrice && i.scenarioPrice > 0 ? i.scenarioPrice / base : 1;

  const fair = base * demandMult * momentumMult * milestoneMult * scenarioMult;
  return Math.round(Math.max(fair, base * 0.4) * 10000) / 10000;
}

// ---------------------------------------------------------------------------
// Position P&L
// ---------------------------------------------------------------------------

export type PositionPnl = {
  value: number; // current mark-to-market
  cost: number; // cost basis
  pnl: number; // value - cost
  pct: number; // pnl / cost * 100
};

export function positionPnl(
  units: number,
  costBasis: number,
  currentPrice: number,
): PositionPnl {
  const value = round2(units * currentPrice);
  const pnl = round2(value - costBasis);
  const pct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  return { value, cost: costBasis, pnl, pct: round2(pct) };
}

/** What an early exit would return right now (current price − 2% spread). */
export function projectedExitProceeds(units: number, currentPrice: number): number {
  return round2(units * currentPrice * (1 - EXIT_SPREAD));
}

/** Realised P&L once a position is closed (proceeds recorded on the row). */
export function realizedReturn(costBasis: number, proceeds: number): PositionPnl {
  const pnl = round2(proceeds - costBasis);
  const pct = costBasis > 0 ? round2((pnl / costBasis) * 100) : 0;
  return { value: proceeds, cost: costBasis, pnl, pct };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
