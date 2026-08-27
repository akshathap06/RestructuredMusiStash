# MusiStash — Master Handoff Document

This is the **only** documentation file in the repo. It explains what the product is, how the codebase is organized, how the backend works, and what state everything is in. Written 2026-08-27 for handoff.

---

## 1. What this app is

MusiStash is a **paper-trading platform for music**: fans discover artists (Spotify-style), simulate backing their projects with paper money (Robinhood-style), and join a waitlist for a future real-money launch. Artists get cinematic profiles and can create funding projects.

**Hard constraint — simulation only.** No real investments, securities, deposits, withdrawals, or returns. Every trade/portfolio/project-finance screen must show:

> Paper trading simulation only. No real money, securities, ownership, or financial returns are being offered.

Constants for this copy live in `src/features/artists/types/experience.ts` (`PAPER_DISCLOSURE_SHORT` / `PAPER_DISCLOSURE_BODY`).

---

## 2. Stack & how to run

- **Expo 54 / React Native 0.81 / React 19 / TypeScript (strict)**
- **Supabase** (auth, Postgres, storage, edge functions) — project ref `dwbetxanfumneukrqodd`, client config hardcoded in `src/lib/supabase.ts`
- **React Navigation 7** (stack + bottom tabs), React Context for state, AsyncStorage for the paper wallet
- No chart library — the portfolio chart is dependency-free (see §6)

```bash
npm install
npx expo start --dev-client --port 8082   # dev client build already installed on iOS sim
# iOS bundle id: com.akshatthapliyal.MusiStash (ios/ dir is checked in)
```

`npx tsc --noEmit` has 19 **pre-existing** errors in legacy screens (auth screens, AgenticManager, ArtistProfileScreen, shared/ui). None block Metro/runtime. `App.tsx` and all V2 code (profile, portfolio, charts, artist creation) are clean.

---

## 3. Codebase map

```
App.tsx                     ← ALL navigation: tabs, stacks, universal header + hamburger menu
index.ts                    ← entry
src/
  config/featureFlags.ts    ← PAPER_TRADING_ENABLED, AGENTIC_MANAGER_ENABLED, WAITLIST_ENABLED
  styles/theme.ts           ← design tokens (MusiStashTheme) — dark violet system
  lib/supabase.ts           ← supabase clients (anon key hardcoded)
  contexts/AuthContext.tsx  ← auth state (also re-exported at features/auth/AuthContext)
  services/                 ← thin re-export shims + moderationService + analytics stub
  features/
    auth/          screens: Welcome/Login/Register/RoleSelection/ArtistOnboarding...
    explore/       ExploreScreen = Explore tab (embeds posts feed + search)
    posts/         feed (PostsScreen), CreatePostScreen, CreateHubScreen (Create tab), mediaUploadService
    artists/       V2 artist experience — see §5
    paper-trading/ V2 portfolio + trading — see §6
    profile/       ProfileV2Screen (Profile tab, role-aware) + legacy services
    social/        followService (follower_id → user, artist_id → artist profile)
    notifications/ NotificationsScreen + service
    settings/      Settings stack screens
    waitlist/      WaitlistScreen
    ai/            AgenticManagerScreen (venue outreach concept, flag-gated)
    shared/        ErrorBoundary, ui primitives
supabase/
  migrations/20260825_v2_restructure.sql  ← authoritative record of the DB restructure
  functions/                              ← deployed edge functions (see §8)
scripts/                                  ← one-off migration scripts (historical)
```

### Navigation (all in `App.tsx`)

- **Tabs:** Portfolio · Explore (initial) · Create · Profile
- **UniversalHeader** (in App.tsx): avatar left → slide-in menu, title center, bell right. Robinhood-inspired, minimal. Menu config = `MENU_SECTIONS` const.
- **Key stack routes:** `ArtistExperience` (public artist page), `ProjectDetail`, `PaperTrade`, `CreateArtist` (wizard), `CreateArtistProject`, `CreatePost`, `Waitlist`, `Notifications`, `Settings`, `AgenticManager`, `BrowseArtists`.
- Profile tab is its own stack (`ProfileStackNavigator`) rooted at `ProfileV2Screen`.

---

## 4. Design system

Tokens in `src/styles/theme.ts`. Core palette used across all V2 screens:

| Token | Value |
|---|---|
| background | `#080A0D` |
| surface | `#101318` |
| borderSubtle | `rgba(255,255,255,0.10)` |
| textPrimary / Secondary / Muted | `#F5F3EF` / `#AAA8AE` / `#73717A` |
| accent | `#8B5CF6` (violet) |
| positive / negative | `#62D892` / `#EF4444` |

Rules: dark-first, minimal, no gradients/glow, `fontVariant: ['tabular-nums']` for money, hairline dividers, 44pt touch targets, disclosure line on all finance UI.

---

## 5. Artist experience (V2)

- **`ArtistExperienceScreen`** (`src/features/artists/screens/`) — the cinematic public profile template every artist uses. Loads via `artistExperienceService` (Supabase `artist_profiles` + posts→tracks). Demo artist: **Kaleb** (`artistId: 'artist_kaleb'`, mock data in `src/features/artists/data/kalebDemo.ts` incl. the flagship $10k EP project).
- **`CreateArtistV2Screen`** — 3-step become-an-artist wizard (identity → photos → story). Calls `ArtistAccountService.createArtistAccount`, writes `profile_photo_url`/`banner_photo_url` (never the legacy base64 columns).
- **`CreateArtistProjectScreen`** — artists create paper projects from their profile/Create tab. Persists via `artistProjectService` (AsyncStorage; Supabase `artist_projects` table exists and is ready to wire).
- **`ProjectDetailScreen`** (`paper-trading/screens/`) — project page: funding summary, use-of-funds, scenario calculator, backing sheet. Components in `paper-trading/components/project/` and `components/sheets/`.
- Playback: `src/features/artists/hooks/PlaybackContext.tsx` (one audio source at a time).

---

## 6. Paper trading

- **Wallet**: `paperWalletService` (`paper-trading/services/`) — AsyncStorage ledger, $10,000 grant, positions, transactions, `getPortfolioHistory(userId, range)` generates chart series. **This is the seam to swap to Supabase** (tables already exist, §7).
- **PortfolioScreen** (Portfolio tab): Robinhood-style — big tabular value header, scrubbing swaps header to the scrubbed point, range selector (1D–ALL), buying power, position rows.
- **`InteractiveLineChart`** (`paper-trading/components/charts/`): built from plain Views (rotated 2px segments + PanResponder scrub, ≤60 segments). **Deliberately no react-native-svg** — adding native deps breaks the prebuilt dev client.
- **`PaperTradeScreen`**: backing flow with confirmation + disclosure.

---

## 7. Database (Supabase — PRODUCTION, restructured 2026-08-25)

The DB was audited and restructured live. Full record: `supabase/migrations/20260825_v2_restructure.sql`.

### `public` schema (19 tables, all lean)

- **Kept (real data):** `users` (82), `artist_profiles` (26), `posts`, `post_likes`, `comments`, `comment_likes`, `follow_relationships` (80), `blocked_users`, `content_reports`, `feature_flags`, view `comments_with_users`, plus `favorite_venues` + `financial_profiles` (used by AgenticManager).
- **New V2 (RLS enabled):** `paper_wallets` ($10k default), `artist_projects`, `paper_positions`, `paper_transactions`, `project_valuations` (chart history), `notifications`, `waitlist_entries`.
- Indexed on all hot paths (posts, comments, follows, positions, valuations).

### `archive` schema (63 tables — NOT deleted)

Everything unused was **moved, not dropped**: internal CRM (`internal_*`), events/venues/tickets, messaging, the entire marketplace/service-provider suite, legacy investing, duplicate follow tables, and `artist_profiles_photos_backup` (49MB of legacy base64 images that were stripped from `artist_profiles`, shrinking it 54MB → 680kB). Hidden from PostgREST. Restore any table with:

```sql
alter table archive.<name> set schema public;
```

### Access for agents/devs

- CLI is linked (`supabase/.temp/project-ref`). Run SQL via the Management API:
  `POST https://api.supabase.com/v1/projects/dwbetxanfumneukrqodd/database/query` with a personal access token (`supabase login` stores one in the macOS keychain under "Supabase CLI").
- ⚠️ `public.posts`, `post_likes`, `comments`, `comment_likes`, `blocked_users` have **RLS disabled** (pre-existing). Add policies before public launch.
- Caching/Redis was evaluated and **deliberately skipped** at this scale; revisit only with real traffic.

---

## 8. Edge functions (deployed, in `supabase/functions/`)

`post-filter`, `comment-filter` (content moderation — active), `send-verification-email`, and 8 Stripe functions (`create-connect-account`, `create-payment-intent`, etc.) left over from the removed marketplace — harmless, deletable whenever.

---

## 9. What was removed (find it in git history)

On branch `feature/v2-artist-project-experience`, the following were **deleted from the working tree** (their DB tables live in `archive.*`; code recoverable via git):

- `src/features/`: `service-providers`, `delivery`, `projects` (marketplace workflow), `payments` (incl. StripeProvider — removed from App root), `messaging`, `investments` (legacy campaigns/shares), `files`, `reviews`
- Legacy screens: old 3.5k-line `ProfileScreen` (→ `ProfileV2Screen`), old 1.7k-line `CreateArtistScreen` (→ `CreateArtistV2Screen`), `ArtistProfileViewScreen` (→ `ArtistExperienceScreen`)
- All dead `src/services/*` re-export shims, marketplace modals, old feature-flag keys (`MARKETPLACE_ENABLED`, `MESSAGING_ENABLED`, `LEGACY_INVESTMENT_UI`), and 10 scattered `.md` docs (consolidated into this file)
- The `@stripe/stripe-react-native` npm package is still in `package.json` (removing native deps requires a dev-client rebuild) — unused at runtime.

---

## 10. Paper-investing engine (added 2026-08-28)

Simulates MusiStash's future real-money artist-project investing so pricing,
portfolio behaviour and project economics can be validated before regulated real
money. **Simulation only — "MusiStash Cash", model prices and returns have no
monetary value.** Object model: a fan takes a **position** in an artist
**PROJECT** (not "artist stock").

### Object & money model

- **MusiStash Cash** — every account auto-gets $10,000 (`paper_wallets`, RLS
  `auth.uid() = user_id`). Postgres `numeric` throughout (exact decimal — no float error).
- **Funding progress ≠ model price** — two separate concepts:
  - funding = `artist_projects.paper_backing_total / funding_goal`
  - **model price** = `artist_projects.current_paper_share_price` per unit, moved
    by the pricing engine (starts at `initial_price`, default $10).
- `project_valuations` = the model-price time series (chart). `paper_portfolio_snapshots`
  = per-user portfolio value over time (cash + mark-to-market), `cash`/`invested_value` split.
- `paper_transactions.type` ∈ `PAPER_CASH_INITIALIZED | INVEST | SELL |
  PROJECT_SETTLEMENT | FAILED_PROJECT_REFUND | PROJECT_CANCELLATION_REFUND | ADJUSTMENT`
  (with `units` / `price`). `paper_events` = lightweight PoC analytics.

### State machine  (`src/features/paper-trading/domain/projectLifecycle.ts`)

`draft → funding → active → completed`  ·  `funding → failed`  ·  `* → cancelled`.
Status is written **only** by the RPCs below — never by a component.

### Pricing engine — deterministic, swappable  (`supabase/migrations/20260828000002_pricing_engine.sql`)

`fn_project_model_price(project, at)` =
`initial_price × demand(1+0.35·fundingProgress) × momentum(1±0.30) × milestones(1+0.15·done) × scenarioCurve × (1 ± dailyNoise)`,
floored at 40% of base. `fn_daily_noise(seed, day)` is a bounded ±3% value seeded
on `(project, date)` via `hashtextextended` → the same day always yields the same
price (no per-render drift). `fn_project_scores()` derives
`resonance / similarity / momentum / risk / projectedROI` (0–100) from
`monthly_listeners`, `total_streams`, follower count, funding progress + velocity;
written to flat columns and into `ai_analysis` jsonb.
`rpc_reprice_project(id)` pulls the price 30% toward fair value, clamps the daily
move to ±8%, appends a `project_valuations` mark, and is a no-op if priced in the
last 20 h. Client mirror for preview: `src/features/paper-trading/domain/pricing.ts`
(`calculateProjectFairValue`, `positionPnl`, `projectedExitProceeds`).

### Lifecycle RPCs  (`supabase/migrations/20260828000003_lifecycle_settlement.sql`)

| RPC | What |
|---|---|
| `rpc_invest(project, amount)` | debit MusiStash Cash, open/merge position (cost-weighted avg entry) at the **live** model price, bump funding totals; on goal-reached flips `funding → active` + sets `maturity_date = now()+term_weeks`. Alias: `rpc_open_paper_position`. |
| `rpc_exit_position(project)` | early exit at `current_price × 0.98` (2% spread). Position → `closed`, realised P&L recorded. Architected so it can later be gated / replaced by a secondary market. |
| `rpc_settle_project(project, reason?)` | **funded + matured** → settle every open position at the final model price; **funding + past deadline + under goal** → 90% refund (10% simulated loss); `reason='cancel'` → 100% refund. Idempotent: terminal-status guard + `where status='open'` set update → running twice pays once. |
| `rpc_cancel_project(project)` | owner check (`artist_profiles.user_id = auth.uid()`) → `rpc_settle_project(id,'cancel')`. |
| `rpc_expire_due_projects()` / `rpc_snapshot_all_portfolios()` / `rpc_reprice_all_projects()` | cron units. |

**Schedule:** `pg_cron` job `musistash-paper-daily` (08:00 UTC) runs
reprice-all → expire-due → snapshot-all. The client also calls
`rpc_reprice_project` opportunistically when opening a stale project.

### Services / screens

- `paperWalletService`: `invest()` / `exitPosition()` / `getPositions()` /
  `getClosedPositions()` / `getPortfolioSummary()` (cash, invested, unrealised +
  realised P&L, return %).
- `artistProjectService`: lifecycle fields, `getPriceHistory()`, `repriceIfStale()`, `cancel()`.
- `ProjectDetailScreen`: **current model price + price sparkline** (distinct from
  funding progress), status pill, "your position" card with **Exit** →
  `BackingReceiptScreen`. `PortfolioScreen`: real P&L, **COMPLETED** section
  (settled / refunded / closed), MusiStash Cash. Explore filters:
  Trending / Closing soon / High resonance / High momentum / New.

### Waitlist — removed

The standalone Waitlist screen is gone. A `handle_new_user` trigger on
`auth.users` auto-enrols **every** signup into `waitlist_entries` with
`platform` (`app`/`web`/`unknown`, from `raw_user_meta_data`) + `source`;
`authService.register` passes `platform:'app'`. All 95 existing users backfilled.
`waitlist_overview` view for admin. Old CTAs now route to **Explore**.

### Live-money mapping (contingencies)

The settlement math is identical for real money — swap the paper wallet for a
regulated ledger + escrow, add KYC/AML, and gate/replace `rpc_exit_position`
with a real secondary market. **Not built (spec §23):** payments, Stripe, KYC,
brokerage, order books, real securities, tax reporting.

---

## 11. Known issues / next steps

1. 19 pre-existing TS errors in legacy screens (see §2) — cosmetic, worth a cleanup pass.
2. `PaperTradeScreen` and `CreateHubScreen` are unreferenced (superseded) — dead but harmless.
3. Portfolio chart is flat until 2+ daily snapshots accrue per user (cron / trades fill it).
4. Legacy auth / onboarding / AgenticManager screens inherit the blue palette via
   `theme.ts` aliases but aren't hand-tuned to the "Paper Mobile" design.
5. Web signups need the web app to pass `options.data.platform='web'` to `supabase.auth.signUp`
   (out of this repo) — the trigger already reads it.
6. `AIAnalysisSheet` shows `factors` but not yet the 5 derived scores as a dedicated block.
