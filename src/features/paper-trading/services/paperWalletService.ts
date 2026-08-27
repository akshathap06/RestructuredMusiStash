import { supabase } from '../../../lib/supabase';
import { positionPnl } from '../domain/pricing';

const INITIAL_GRANT = 10_000;

export type PaperWallet = {
  userId: string;
  availableBalance: number;
  createdAt: string;
  updatedAt: string;
};

export type PaperTransactionType =
  | 'PAPER_CASH_INITIALIZED'
  | 'INVEST'
  | 'SELL'
  | 'PROJECT_SETTLEMENT'
  | 'FAILED_PROJECT_REFUND'
  | 'PROJECT_CANCELLATION_REFUND'
  | 'ADJUSTMENT';

export type PaperTransaction = {
  id: string;
  userId: string;
  type: PaperTransactionType;
  amount: number;
  units?: number;
  price?: number;
  projectId?: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};

export type PaperPositionStatus = 'open' | 'closed' | 'settled' | 'refunded';

export type PaperPosition = {
  id: string;
  userId: string;
  projectId: string;
  projectTitle: string;
  artistName: string;
  artworkUrl?: string | null;
  units: number;
  costBasis: number;
  unitPriceAtOpen: number;
  currentUnitPrice: number;
  status: PaperPositionStatus;
  projectStatus?: string;
  openedAt: string;
  closedAt?: string | null;
  realizedPnl?: number | null;
  proceeds?: number | null;
  exitPrice?: number | null;
};

export type OpenPositionInput = {
  projectId: string;
  projectTitle: string;
  artistName: string;
  notional: number;
};

export type PortfolioSummary = {
  cash: number; // MusiStash Cash
  positionsValue: number; // mark-to-market of open positions
  investedValue: number; // alias of positionsValue (spec wording)
  costBasis: number; // Σ cost of open positions
  unrealizedPnl: number;
  realizedPnl: number; // Σ realized_pnl over closed/settled/refunded
  total: number; // cash + positionsValue
  totalReturn: number; // total - (cash-at-start baseline $10k) ≈ unrealized + realized
  returnPct: number; // totalReturn / 10000 * 100
  dayChangePct: number;
};

export type PortfolioHistoryPoint = { t: number; v: number };

export type HistoryRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

// ---------------------------------------------------------------------------
// Row shapes + mappers
// ---------------------------------------------------------------------------
type WalletRow = {
  user_id: string;
  balance: number | string;
  created_at: string;
  updated_at: string;
};

type PositionRow = {
  id: string;
  user_id: string;
  project_id: string;
  amount: number | string;
  shares: number | string;
  entry_share_price: number | string;
  status: PaperPositionStatus;
  created_at: string;
  closed_at: string | null;
  realized_pnl: number | string | null;
  proceeds: number | string | null;
  exit_price: number | string | null;
  artist_projects?: {
    title: string | null;
    artwork_url: string | null;
    status: string | null;
    current_paper_share_price: number | string | null;
    artist_profiles?: { artist_name: string | null; name: string | null } | null;
  } | null;
};

type TransactionRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  type: PaperTransactionType;
  amount: number | string;
  units: number | string | null;
  price: number | string | null;
  balance_after: number | string | null;
  created_at: string;
};

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'string' ? parseFloat(v) : v ?? 0;
  return Number.isFinite(n as number) ? (n as number) : 0;
};

function mapWallet(row: WalletRow): PaperWallet {
  return {
    userId: row.user_id,
    availableBalance: num(row.balance),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPosition(row: PositionRow): PaperPosition {
  const project = row.artist_projects ?? null;
  const artist = project?.artist_profiles ?? null;
  const currentUnitPrice =
    num(project?.current_paper_share_price) || num(row.entry_share_price);
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    projectTitle: project?.title ?? 'Project',
    artistName: artist?.artist_name ?? artist?.name ?? 'Artist',
    artworkUrl: project?.artwork_url ?? null,
    units: num(row.shares),
    costBasis: num(row.amount),
    unitPriceAtOpen: num(row.entry_share_price),
    currentUnitPrice,
    status: row.status ?? 'open',
    projectStatus: project?.status ?? undefined,
    openedAt: row.created_at,
    closedAt: row.closed_at,
    realizedPnl: row.realized_pnl != null ? num(row.realized_pnl) : null,
    proceeds: row.proceeds != null ? num(row.proceeds) : null,
    exitPrice: row.exit_price != null ? num(row.exit_price) : null,
  };
}

function mapTransaction(row: TransactionRow): PaperTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amount: num(row.amount),
    units: row.units != null ? num(row.units) : undefined,
    price: row.price != null ? num(row.price) : undefined,
    projectId: row.project_id ?? undefined,
    createdAt: row.created_at,
    meta: row.balance_after != null ? { balanceAfter: num(row.balance_after) } : undefined,
  };
}

const POSITION_SELECT =
  '*, artist_projects(title, artwork_url, status, current_paper_share_price, artist_profiles(artist_name, name))';

const DAY = 24 * 60 * 60 * 1000;
const RANGE_START_MS: Record<HistoryRange, number> = {
  '1D': DAY,
  '1W': 7 * DAY,
  '1M': 30 * DAY,
  '3M': 90 * DAY,
  '1Y': 365 * DAY,
  ALL: 10 * 365 * DAY,
};
const SNAPSHOT_STALE_MS = 12 * 60 * 60 * 1000;

class PaperWalletService {
  /**
   * Supabase-backed MusiStash Cash + paper positions. Every money-mutating
   * operation goes through a SECURITY DEFINER RPC. Simulation only.
   */
  async ensureWallet(_userId?: string): Promise<PaperWallet> {
    const { data, error } = await supabase.rpc('rpc_ensure_paper_wallet');
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Could not load your MusiStash Cash');
    return mapWallet(data as WalletRow);
  }

  async resetAccount(_userId?: string): Promise<PaperWallet> {
    const { data, error } = await supabase.rpc('rpc_reset_paper_account');
    if (error) throw new Error(error.message);
    return mapWallet(data as WalletRow);
  }

  async getWallet(userId: string): Promise<PaperWallet | null> {
    const { data, error } = await supabase
      .from('paper_wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapWallet(data as WalletRow) : null;
  }

  /** Open (active) positions. */
  async getPositions(userId: string): Promise<PaperPosition[]> {
    const { data, error } = await supabase
      .from('paper_positions')
      .select(POSITION_SELECT)
      .eq('user_id', userId)
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as PositionRow[] | null)?.map(mapPosition) ?? [];
  }

  /** Closed / settled / refunded positions — the "Completed investments" history. */
  async getClosedPositions(userId: string): Promise<PaperPosition[]> {
    const { data, error } = await supabase
      .from('paper_positions')
      .select(POSITION_SELECT)
      .eq('user_id', userId)
      .in('status', ['closed', 'settled', 'refunded'])
      .order('closed_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as PositionRow[] | null)?.map(mapPosition) ?? [];
  }

  async getTransactions(userId: string): Promise<PaperTransaction[]> {
    const { data, error } = await supabase
      .from('paper_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as TransactionRow[] | null)?.map(mapTransaction) ?? [];
  }

  /** Back a project with MusiStash Cash at the live model price. */
  async invest(
    _userId: string,
    input: OpenPositionInput,
  ): Promise<{ wallet: PaperWallet; position: PaperPosition; transaction: PaperTransaction }> {
    const { projectId, notional } = input;
    if (!(notional > 0)) throw new Error('Amount must be greater than zero');

    const { data, error } = await supabase.rpc('rpc_invest', {
      p_project_id: projectId,
      p_amount: notional,
    });
    if (error) throw new Error(error.message || 'Could not open position');

    const payload = data as {
      wallet: WalletRow;
      position: PositionRow;
      transaction: TransactionRow;
    };
    const position = mapPosition(payload.position);
    position.projectTitle = input.projectTitle || position.projectTitle;
    position.artistName = input.artistName || position.artistName;
    return {
      wallet: mapWallet(payload.wallet),
      position,
      transaction: mapTransaction(payload.transaction),
    };
  }

  /** Back-compat alias. */
  openPosition = this.invest;

  /** Early exit — sell an open position at current model price − 2% spread. */
  async exitPosition(
    projectId: string,
  ): Promise<{ wallet: PaperWallet; position: PaperPosition; transaction: PaperTransaction }> {
    const { data, error } = await supabase.rpc('rpc_exit_position', {
      p_project_id: projectId,
    });
    if (error) throw new Error(error.message || 'Could not exit position');
    const payload = data as {
      wallet: WalletRow;
      position: PositionRow;
      transaction: TransactionRow;
    };
    return {
      wallet: mapWallet(payload.wallet),
      position: mapPosition(payload.position),
      transaction: mapTransaction(payload.transaction),
    };
  }

  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    const [wallet, open, closed] = await Promise.all([
      this.ensureWallet(userId),
      this.getPositions(userId),
      this.getClosedPositions(userId),
    ]);

    let positionsValue = 0;
    let costBasis = 0;
    for (const p of open) {
      const pnl = positionPnl(p.units, p.costBasis, p.currentUnitPrice);
      positionsValue += pnl.value;
      costBasis += p.costBasis;
    }
    positionsValue = round2(positionsValue);
    const unrealizedPnl = round2(positionsValue - costBasis);
    const realizedPnl = round2(
      closed.reduce((s, p) => s + (p.realizedPnl ?? 0), 0),
    );

    const cash = wallet.availableBalance;
    const total = round2(cash + positionsValue);
    const totalReturn = round2(total - INITIAL_GRANT);
    const returnPct = round2((totalReturn / INITIAL_GRANT) * 100);

    return {
      cash,
      positionsValue,
      investedValue: positionsValue,
      costBasis: round2(costBasis),
      unrealizedPnl,
      realizedPnl,
      total,
      totalReturn,
      returnPct,
      dayChangePct: await this.dayChangePct(userId, total),
    };
  }

  private async dayChangePct(userId: string, currentTotal: number): Promise<number> {
    const { data } = await supabase
      .from('paper_portfolio_snapshots')
      .select('value, recorded_at')
      .eq('user_id', userId)
      .gte('recorded_at', new Date(Date.now() - DAY).toISOString())
      .order('recorded_at', { ascending: true })
      .limit(1);
    const first = (data as { value: number | string }[] | null)?.[0];
    if (!first) return 0;
    const base = num(first.value);
    if (base <= 0) return 0;
    return round2(((currentTotal - base) / base) * 100);
  }

  async getPortfolioHistory(
    userId: string,
    range: HistoryRange,
  ): Promise<PortfolioHistoryPoint[]> {
    const since = new Date(Date.now() - RANGE_START_MS[range]).toISOString();
    const { data, error } = await supabase
      .from('paper_portfolio_snapshots')
      .select('value, recorded_at')
      .eq('user_id', userId)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true });
    if (error) throw new Error(error.message);

    let rows = (data as { value: number | string; recorded_at: string }[] | null) ?? [];

    const newest = rows[rows.length - 1];
    const stale =
      !newest || Date.now() - new Date(newest.recorded_at).getTime() > SNAPSHOT_STALE_MS;
    if (stale) {
      const { data: total } = await supabase.rpc('rpc_snapshot_portfolio');
      if (typeof total === 'number' || typeof total === 'string') {
        rows = [...rows, { value: total, recorded_at: new Date().toISOString() }];
      }
    }

    const points = rows.map((r) => ({ t: new Date(r.recorded_at).getTime(), v: num(r.value) }));
    if (points.length >= 2) return points;

    const summary = await this.getPortfolioSummary(userId);
    const now = Date.now();
    return [
      { t: now - RANGE_START_MS[range], v: summary.total },
      { t: now, v: summary.total },
    ];
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const paperWalletService = new PaperWalletService();
export default paperWalletService;
export { INITIAL_GRANT };
