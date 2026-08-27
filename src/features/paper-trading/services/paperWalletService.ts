import { supabase } from '../../../lib/supabase';

const INITIAL_GRANT = 10_000;

export type PaperWallet = {
  userId: string;
  availableBalance: number;
  createdAt: string;
  updatedAt: string;
};

export type PaperTransactionType =
  | 'initial_grant'
  | 'open_position'
  | 'close_position'
  | 'adjustment';

export type PaperTransaction = {
  id: string;
  userId: string;
  type: PaperTransactionType;
  amount: number;
  projectId?: string;
  idempotencyKey?: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};

export type PaperPosition = {
  id: string;
  userId: string;
  projectId: string;
  projectTitle: string;
  artistName: string;
  units: number;
  costBasis: number;
  unitPriceAtOpen: number;
  currentUnitPrice: number;
  status: 'open' | 'closed' | 'suspended';
  openedAt: string;
  closedAt?: string;
};

export type OpenPositionInput = {
  projectId: string;
  projectTitle: string;
  artistName: string;
  notional: number;
};

export type PortfolioSummary = {
  cash: number;
  positionsValue: number;
  total: number;
  dayChangePct: number;
};

export type PortfolioHistoryPoint = {
  t: number;
  v: number;
};

export type HistoryRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

// ---------------------------------------------------------------------------
// Row shapes coming back from Supabase (snake_case) + mappers to the public
// camelCase types above, which the screens already consume.
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
  status: PaperPosition['status'];
  created_at: string;
  artist_projects?: {
    title: string | null;
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
  const currentUnitPrice = num(project?.current_paper_share_price) || num(row.entry_share_price);
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    projectTitle: project?.title ?? 'Paper project',
    artistName: artist?.artist_name ?? artist?.name ?? 'Artist',
    units: num(row.shares),
    costBasis: num(row.amount),
    unitPriceAtOpen: num(row.entry_share_price),
    currentUnitPrice,
    status: row.status ?? 'open',
    openedAt: row.created_at,
  };
}

function mapTransaction(row: TransactionRow): PaperTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amount: num(row.amount),
    projectId: row.project_id ?? undefined,
    createdAt: row.created_at,
    meta: row.balance_after != null ? { balanceAfter: num(row.balance_after) } : undefined,
  };
}

const POSITION_SELECT =
  '*, artist_projects(title, current_paper_share_price, artist_profiles(artist_name, name))';

// Query window (ms) for portfolio history by range.
const DAY = 24 * 60 * 60 * 1000;
const RANGE_START_MS: Record<HistoryRange, number> = {
  '1D': DAY,
  '1W': 7 * DAY,
  '1M': 30 * DAY,
  '3M': 90 * DAY,
  '1Y': 365 * DAY,
  ALL: 10 * 365 * DAY,
};

// Re-snapshot on load if the newest snapshot is older than this.
const SNAPSHOT_STALE_MS = 12 * 60 * 60 * 1000;

class PaperWalletService {
  /**
   * Supabase-backed paper wallet. Money-mutating operations go through
   * SECURITY DEFINER RPCs so balance / positions / ledger / project totals /
   * valuation marks / portfolio snapshots stay consistent. Simulation only —
   * never touches real money or Stripe.
   */
  async ensureWallet(_userId: string): Promise<PaperWallet> {
    const { data, error } = await supabase.rpc('rpc_ensure_paper_wallet');
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Could not load paper wallet');
    return mapWallet(data as WalletRow);
  }

  /** Clear positions + ledger and restore the $10,000 grant. */
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

  async getTransactions(userId: string): Promise<PaperTransaction[]> {
    const { data, error } = await supabase
      .from('paper_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as TransactionRow[] | null)?.map(mapTransaction) ?? [];
  }

  async openPosition(
    _userId: string,
    input: OpenPositionInput
  ): Promise<{ wallet: PaperWallet; position: PaperPosition; transaction: PaperTransaction }> {
    const { projectId, notional } = input;
    if (!(notional > 0)) {
      throw new Error('Notional must be greater than zero');
    }

    const { data, error } = await supabase.rpc('rpc_open_paper_position', {
      p_project_id: projectId,
      p_amount: notional,
    });
    if (error) {
      // Surface the friendly messages raised by the RPC verbatim.
      throw new Error(error.message || 'Could not open paper position');
    }

    const payload = data as {
      wallet: WalletRow;
      position: PositionRow;
      transaction: TransactionRow;
    };
    const position = mapPosition(payload.position);
    // The RPC returns the raw position row without the joined project; fill the
    // display fields from the caller's input so the UI has names immediately.
    position.projectTitle = input.projectTitle || position.projectTitle;
    position.artistName = input.artistName || position.artistName;

    return {
      wallet: mapWallet(payload.wallet),
      position,
      transaction: mapTransaction(payload.transaction),
    };
  }

  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    const wallet = await this.ensureWallet(userId);
    const positions = await this.getPositions(userId);
    const positionsValue = positions.reduce(
      (sum, p) => sum + p.units * p.currentUnitPrice,
      0
    );
    const cash = wallet.availableBalance;

    return {
      cash,
      positionsValue,
      total: cash + positionsValue,
      dayChangePct: await this.dayChangePct(userId, cash + positionsValue),
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
    return ((currentTotal - base) / base) * 100;
  }

  async getPortfolioHistory(
    userId: string,
    range: HistoryRange
  ): Promise<PortfolioHistoryPoint[]> {
    const since = new Date(Date.now() - RANGE_START_MS[range]).toISOString();
    let { data, error } = await supabase
      .from('paper_portfolio_snapshots')
      .select('value, recorded_at')
      .eq('user_id', userId)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true });
    if (error) throw new Error(error.message);

    let rows = (data as { value: number | string; recorded_at: string }[] | null) ?? [];

    // Opportunistically record a fresh snapshot if the newest one is stale, so
    // the chart keeps moving even without a cron.
    const newest = rows[rows.length - 1];
    const stale =
      !newest || Date.now() - new Date(newest.recorded_at).getTime() > SNAPSHOT_STALE_MS;
    if (stale) {
      const { data: total } = await supabase.rpc('rpc_snapshot_portfolio');
      if (typeof total === 'number' || typeof total === 'string') {
        rows = [...rows, { value: total, recorded_at: new Date().toISOString() }];
      }
    }

    const points = rows.map((r) => ({
      t: new Date(r.recorded_at).getTime(),
      v: num(r.value),
    }));

    if (points.length >= 2) return points;

    // Not enough marks yet — a flat 2-point line at the current total.
    const summary = await this.getPortfolioSummary(userId);
    const now = Date.now();
    return [
      { t: now - RANGE_START_MS[range], v: summary.total },
      { t: now, v: summary.total },
    ];
  }
}

export const paperWalletService = new PaperWalletService();
export default paperWalletService;

export { INITIAL_GRANT };
