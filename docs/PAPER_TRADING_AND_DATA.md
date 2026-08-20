# MusiStash V2 — Paper Trading, Data & Analytics

**Constraint:** All values simulated. No securities claims.

---

## 1. Ledger model

### Entities

| Entity | Meaning |
|--------|---------|
| PaperWallet | Per-user simulated cash |
| PaperTransaction | Signed ledger entry |
| PaperPosition | Stake in a project (units × mark) |
| Project | Artist campaign (goal, budget, milestones) |
| ValuationSnapshot | Project unit value over time |
| PortfolioSnapshot | User total over time |

### Current implementation

`src/features/paper-trading/services/paperWalletService.ts` — **AsyncStorage** until Postgres RPCs land.

- Grant: **$10,000** once (`grant:{userId}`)  
- Open position: debit cash, units = notional / unit_price (start **1.0**), merge same project  
- Never calls Stripe  

### Invariants

```
available_balance = sum(transactions.amount) ≥ 0
position.market_value = units * current_unit_value
```

### Valuation v1 (for future server marks)

```
demand = clamp(raised/goal, 0, 1.5)
support = clamp(log10(backers+1)/log10(501), 0, 1)
progress = 0.45*demand + 0.25*milestones + 0.20*engagement + 0.10*resonanceNorm
V = clamp(1.0 * (0.85 + 0.50*progress), 0.70, 1.60)
```

Explainable, bounded, testable. Not a prediction of real returns.

### Close / sell

**Recommendation:** no early close in V2 (founder decision pending).

---

## 2. Scenario calculator (demo / Kaleb)

Separate from live marks. Inputs: funding, raised, gross revenue, expenses, artist %, fan pool %, platform fee %, fee base, user contribution.

**Kaleb sample:** $10k goal; Studio 3k / Mix 2k / Marketing 2k / Video 1.5k / Ops 1.5k; hypothetical revenue $130k; example split artist 90% / fan 10%; recommend fee **5% of fan pool**.

All outputs labeled Hypothetical / Simulated.

---

## 3. Data model (target Postgres)

### New tables

`paper_wallets`, `paper_transactions`, `projects`, `project_budget_items`, `project_milestones`, `paper_positions`, `valuation_snapshots`, `portfolio_snapshots`, `watchlist_items`, `score_snapshots`, `waitlist_entries`, `referrals`

### Reuse

`users`, `artist_profiles`, `posts` (+ engagement), follows, storage, AI Railway scores

### Authz

Wallet/tx/position writes via SECURITY DEFINER RPCs only (`paper_grant_if_needed`, `paper_open_position`, `paper_recompute_portfolio`).

### Migration order

1. Live schema dump (repo migrations are incomplete)  
2. Additive `paper_*` migrations  
3. Stop client `share_purchases` path  
4. Map `investment_interests` → watchlist  
5. Seed demo artists + Kaleb project (`is_demo`)

### Legacy

`funding_campaigns` / `share_purchases` — bridge UI only; CTA now routes to `PaperTrade`.

---

## 4. Analytics event map (condensed)

Destination: PostHog/Amplitude later; stub: `src/services/analytics.ts`.

| Event | When |
|-------|------|
| `account_signed_up` / `account_logged_in` | Auth |
| `paper_grant_received` | First wallet |
| `explore_opened` / `feed_item_impression` | Explore |
| `artist_profile_viewed` / `song_preview_played` | Media |
| `artist_followed` / `item_saved` | Social |
| `project_viewed` | Project |
| `paper_trade_started` / `_completed` / `_failed` | Trade |
| `portfolio_opened` / `portfolio_range_changed` | Portfolio |
| `waitlist_cta_shown` / `waitlist_joined` | Waitlist |
| `post_published` / `project_published` | Artist |

Privacy: no card data; truncate search queries; aggregates for artist dashboards.

---

## 5. Test vectors (ledger)

1. Grant → balance 10000  
2. Buy 1000 @ 1.0 → units 1000, cash 9000  
3. Mark 1.1 → value 1100, +10%  
4. Insufficient balance → reject  
5. Idempotent grant replay → no-op  
