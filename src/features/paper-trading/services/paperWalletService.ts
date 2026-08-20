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

export type HistoryRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

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
    return {
      cash,
      positionsValue,
      total: cash + positionsValue,
      dayChangePct: 0,
    };
  }

  async getPortfolioHistory(
    userId: string,
    range: HistoryRange
  ): Promise<PortfolioHistoryPoint[]> {
    const summary = await this.getPortfolioSummary(userId);
    const total = summary.total;
    const pointCount = RANGE_POINTS[range];
    const spanMs = RANGE_SPAN_MS[range];
    const end = Date.now();
    const start = end - spanMs;

    // Synthetic placeholder series around current total until real snapshots exist.
    const points: PortfolioHistoryPoint[] = [];
    for (let i = 0; i < pointCount; i++) {
      const t = start + (spanMs * i) / Math.max(pointCount - 1, 1);
      const progress = i / Math.max(pointCount - 1, 1);
      const wobble = Math.sin(progress * Math.PI * 2) * 0.012 + (progress - 0.5) * 0.02;
      const v = Math.max(0, total * (1 + wobble * (total > 0 ? 1 : 0)));
      points.push({ t, v: i === pointCount - 1 ? total : v });
    }
    return points;
  }
}

const RANGE_POINTS: Record<HistoryRange, number> = {
  '1D': 24,
  '1W': 28,
  '1M': 30,
  '3M': 36,
  '1Y': 52,
  ALL: 48,
};

const DAY = 24 * 60 * 60 * 1000;
const RANGE_SPAN_MS: Record<HistoryRange, number> = {
  '1D': DAY,
  '1W': 7 * DAY,
  '1M': 30 * DAY,
  '3M': 90 * DAY,
  '1Y': 365 * DAY,
  ALL: 365 * DAY,
};

export const paperWalletService = new PaperWalletService();
export default paperWalletService;
