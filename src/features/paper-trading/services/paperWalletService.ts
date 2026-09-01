import AsyncStorage from '@react-native-async-storage/async-storage';

const INITIAL_GRANT = 10_000;
const INITIAL_UNIT_PRICE = 1.0;

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

export type HistoryRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'YTD';

const walletKey = (userId: string) => `@ms/paper_wallet_${userId}`;
const positionsKey = (userId: string) => `@ms/paper_positions_${userId}`;
const transactionsKey = (userId: string) => `@ms/paper_transactions_${userId}`;

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

class PaperWalletService {
  /**
   * Local AsyncStorage ledger until DB migrations land.
   * Never calls Stripe — paper simulation only.
   */
  async ensureWallet(userId: string): Promise<PaperWallet> {
    const grantKey = `grant:${userId}`;
    const txs = await this.getTransactions(userId);
    const alreadyGranted = txs.some((t) => t.idempotencyKey === grantKey);
    const existing = await this.getWallet(userId);

    if (alreadyGranted) {
      if (existing) return existing;
      const balance = txs.reduce((sum, t) => sum + t.amount, 0);
      const createdAt = nowIso();
      const rebuilt: PaperWallet = {
        userId,
        availableBalance: Math.max(0, balance),
        createdAt,
        updatedAt: createdAt,
      };
      await writeJson(walletKey(userId), rebuilt);
      return rebuilt;
    }

    // Wallet already present without grant marker — do not credit again.
    if (existing) {
      return existing;
    }

    const createdAt = nowIso();
    const wallet: PaperWallet = {
      userId,
      availableBalance: INITIAL_GRANT,
      createdAt,
      updatedAt: createdAt,
    };

    const grantTx: PaperTransaction = {
      id: makeId('tx'),
      userId,
      type: 'initial_grant',
      amount: INITIAL_GRANT,
      idempotencyKey: grantKey,
      createdAt,
      meta: { label: 'Initial paper grant' },
    };

    await writeJson(walletKey(userId), wallet);
    await writeJson(transactionsKey(userId), [...txs, grantTx]);
    await writeJson(positionsKey(userId), []);

    return wallet;
  }

  async getWallet(userId: string): Promise<PaperWallet | null> {
    return readJson<PaperWallet | null>(walletKey(userId), null);
  }

  async getPositions(userId: string): Promise<PaperPosition[]> {
    return readJson<PaperPosition[]>(positionsKey(userId), []);
  }

  async getTransactions(userId: string): Promise<PaperTransaction[]> {
    return readJson<PaperTransaction[]>(transactionsKey(userId), []);
  }

  async openPosition(
    userId: string,
    input: OpenPositionInput
  ): Promise<{ wallet: PaperWallet; position: PaperPosition; transaction: PaperTransaction }> {
    const { projectId, projectTitle, artistName, notional } = input;

    if (!(notional > 0)) {
      throw new Error('Notional must be greater than zero');
    }

    const wallet = await this.ensureWallet(userId);
    if (wallet.availableBalance < notional) {
      throw new Error('Insufficient paper balance');
    }

    const unitPrice = INITIAL_UNIT_PRICE;
    const units = notional / unitPrice;
    const createdAt = nowIso();

    const debitTx: PaperTransaction = {
      id: makeId('tx'),
      userId,
      type: 'open_position',
      amount: -notional,
      projectId,
      createdAt,
      meta: { projectTitle, artistName, units, unitPrice },
    };

    const positions = await this.getPositions(userId);
    const existingIdx = positions.findIndex(
      (p) => p.projectId === projectId && p.status === 'open'
    );

    let position: PaperPosition;
    if (existingIdx >= 0) {
      const prev = positions[existingIdx];
      const mergedCost = prev.costBasis + notional;
      const mergedUnits = prev.units + units;
      position = {
        ...prev,
        projectTitle,
        artistName,
        units: mergedUnits,
        costBasis: mergedCost,
        unitPriceAtOpen: mergedCost / mergedUnits,
        currentUnitPrice: unitPrice,
      };
      positions[existingIdx] = position;
    } else {
      position = {
        id: makeId('pos'),
        userId,
        projectId,
        projectTitle,
        artistName,
        units,
        costBasis: notional,
        unitPriceAtOpen: unitPrice,
        currentUnitPrice: unitPrice,
        status: 'open',
        openedAt: createdAt,
      };
      positions.push(position);
    }

    const updatedWallet: PaperWallet = {
      ...wallet,
      availableBalance: wallet.availableBalance - notional,
      updatedAt: createdAt,
    };

    const txs = await this.getTransactions(userId);
    await writeJson(walletKey(userId), updatedWallet);
    await writeJson(positionsKey(userId), positions);
    await writeJson(transactionsKey(userId), [...txs, debitTx]);

    return { wallet: updatedWallet, position, transaction: debitTx };
  }

  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    const wallet = await this.ensureWallet(userId);
    const positions = (await this.getPositions(userId)).filter((p) => p.status === 'open');
    const positionsValue = positions.reduce(
      (sum, p) => sum + p.units * p.currentUnitPrice,
      0
    );
    const cash = wallet.availableBalance;
    const total = cash + positionsValue;

    // Derive "Today" from the 1D synthetic series so the header and the 1D
    // chart agree. Still a placeholder until real snapshots exist.
    const day = buildRangeSeries(userId, '1D', total);
    const dayOpen = day[0]?.v ?? total;
    const dayChangePct = dayOpen > 0 ? ((total - dayOpen) / dayOpen) * 100 : 0;

    return { cash, positionsValue, total, dayChangePct };
  }

  async getPortfolioHistory(
    userId: string,
    range: HistoryRange
  ): Promise<PortfolioHistoryPoint[]> {
    const summary = await this.getPortfolioSummary(userId);
    return buildRangeSeries(userId, range, summary.total);
  }
}

const RANGE_POINTS: Record<HistoryRange, number> = {
  '1D': 48,
  '1W': 56,
  '1M': 60,
  '3M': 66,
  '1Y': 80,
  YTD: 80,
};

const DAY = 24 * 60 * 60 * 1000;
// YTD span is computed per call (Jan 1 -> now); this is only a fallback.
const RANGE_SPAN_MS: Record<HistoryRange, number> = {
  '1D': DAY,
  '1W': 7 * DAY,
  '1M': 30 * DAY,
  '3M': 90 * DAY,
  '1Y': 365 * DAY,
  YTD: 365 * DAY,
};

/** Milliseconds from the start of the current calendar year until now. */
function ytdSpanMs(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
  return Math.max(DAY, now.getTime() - startOfYear);
}

/** Largest plausible net move across the whole window (fraction of value). */
const RANGE_NET_MOVE: Record<HistoryRange, number> = {
  '1D': 0.015,
  '1W': 0.04,
  '1M': 0.08,
  '3M': 0.16,
  '1Y': 0.45,
  YTD: 0.35,
};

/** Per-step wander amplitude (fraction of the trend value). */
const RANGE_STEP_VOL: Record<HistoryRange, number> = {
  '1D': 0.004,
  '1W': 0.006,
  '1M': 0.008,
  '3M': 0.01,
  '1Y': 0.014,
  YTD: 0.012,
};

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small deterministic PRNG so a range's shape is stable per user. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Synthetic portfolio series for one range. Each range gets its own seed, so
 * the curves have genuinely different shapes; a Brownian bridge keeps the last
 * point exactly on `endValue` while a seeded net move sets the macro trend.
 * Placeholder until real portfolio snapshots are recorded.
 */
function buildRangeSeries(
  userId: string,
  range: HistoryRange,
  endValue: number
): PortfolioHistoryPoint[] {
  const n = RANGE_POINTS[range];
  const span = range === 'YTD' ? ytdSpanMs() : RANGE_SPAN_MS[range];
  const end = Date.now();
  const start = end - span;
  const denom = Math.max(n - 1, 1);

  if (!(endValue > 0)) {
    return Array.from({ length: n }, (_, i) => ({
      t: start + (span * i) / denom,
      v: 0,
    }));
  }

  const rand = mulberry32(hashSeed(`${userId}:${range}`));
  const netReturn = (rand() * 2 - 1) * RANGE_NET_MOVE[range];
  const startValue = endValue / (1 + netReturn);
  const stepVol = RANGE_STEP_VOL[range];

  // Random walk, then detrend to a bridge that is 0 at both ends.
  const walk: number[] = [0];
  for (let i = 1; i < n; i++) {
    walk.push(walk[i - 1] + (rand() * 2 - 1) * stepVol);
  }
  const drift = walk[n - 1];

  const points: PortfolioHistoryPoint[] = [];
  for (let i = 0; i < n; i++) {
    const bridge = walk[i] - (drift * i) / denom;
    const trend = startValue + (endValue - startValue) * (i / denom);
    const v = Math.max(0, trend * (1 + bridge));
    points.push({
      t: start + (span * i) / denom,
      v: i === n - 1 ? endValue : v,
    });
  }
  return points;
}

export const paperWalletService = new PaperWalletService();
export default paperWalletService;
