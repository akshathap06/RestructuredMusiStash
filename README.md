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
- Charts: `react-native-svg` only — the portfolio chart is a hand-built smoothed `<Path>` (see §6)

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
- **`InteractiveLineChart`** (`paper-trading/components/charts/`): `react-native-svg`. One monotone-cubic smoothed `<Path>` (no overshoot) + gradient area fill, dashed baseline at the period-open value, PanResponder scrub with a crosshair + dot. Same `points` / `onScrub` API as before. Adding `react-native-svg` is a native dep — **the dev client must be rebuilt** (`npx expo run:ios` / EAS).
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

## 10. Known issues / next steps

1. 19 pre-existing TS errors in legacy screens (see §2) — cosmetic, worth a cleanup pass.
2. Wire `paperWalletService` + `artistProjectService` from AsyncStorage to the Supabase tables (§7).
3. RLS policies for the social tables (§7 warning).
4. `summary.dayChangePct` is always 0 until real valuation marks exist (`project_valuations` is the intended source).
5. Waitlist screen exists; `waitlist_entries` table is ready but not yet wired.
6. Analytics is a console stub (`src/services/analytics.ts`) — wire PostHog/Amplitude when needed.
