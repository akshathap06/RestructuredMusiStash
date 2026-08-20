# MusiStash V2 — Product & Implementation

**Owner:** Fable (lead)  
**Updated:** 2026-08-03  
**Constraint:** Paper trading / simulation only. No real investments, deposits, withdrawals, or securities.

---

## 1. Vision

MusiStash is a paper-trading platform for music: Spotify-like discovery, Robinhood-simple portfolio, TikTok-style artist content, with clear simulation labeling while building a real-money waitlist.

**Disclosure (required on trade / portfolio / project finance UI):**  
> Paper trading simulation only. No real money, securities, ownership, or financial returns are being offered.

---

## 2. Audit snapshot (current codebase)

| Area | Finding |
|------|---------|
| Stack | Expo 54, RN 0.81.5, React 19, Supabase, React Navigation 7, Context state, Paper UI, expo-av, Stripe (marketplace) |
| Tabs (legacy) | Profile · Investment · Create · Posts |
| Tabs (V2 now) | **Portfolio · Explore · Create · Profile** |
| Reusable | Auth, posts/feed, artist profiles, follows, campaign browse IA, AutoplayVideo, theme |
| Broken / risk | Share purchase was escrow DB-only (no Stripe); Browse Artists miswired (fixed); Apple Sign-In gap (fixed); orphan `src/screens` (deleted); 0 a11y labels; no chart lib; incomplete repo migrations |
| Quarantined | Marketplace + messaging behind `featureFlags` (`MARKETPLACE_ENABLED=false`, `MESSAGING_ENABLED=false`) |

Full historical agent notes were condensed into this file set.

---

## 3. Roles & navigation

| Role | Can do |
|------|--------|
| Fan | Explore, paper back, portfolio, waitlist |
| Artist | Fan + Create tab tools, projects, profile |

**Mobile tabs:** Portfolio | Explore | Create | Profile  

Explore segments: For You (feed) · Artists · Search  

---

## 4. Core journeys

1. Sign up → interests → **$10k paper grant** → Explore → artist/project → **PaperTrade** → Portfolio → Waitlist  
2. Artist: Create → post/project → demand metrics (dashboard later)

---

## 5. Feature status (post-reconfig)

| Feature | Status |
|---------|--------|
| Feature flags | Done — `src/config/featureFlags.ts` |
| Portfolio tab + local paper wallet | Done — AsyncStorage ledger |
| PaperTrade flow + disclosure | Done |
| Explore hub | Done |
| Waitlist screen + CTA | Done |
| Violet theme Direction A | Done — `src/styles/theme.ts` |
| Marketplace/messaging nav | Hidden by flag (code retained) |
| Campaign CTA → Simulate Backing | Done (not SharePurchase) |
| ArtistExperience profile (Kaleb) | Done — hero, popular tracks, mini-player |
| ProjectDetail (simplified) | Done — sheets, calculator, sticky paper back |
| Live DB paper tables | Not yet — local wallet until schema dump |
| Real audio streaming URLs | Not yet — progress simulated in PlaybackContext |

---

## 6. Implementation phases

| Phase | Objective | Gate |
|-------|-----------|------|
| **0** Stabilization | Orphans deleted, tsconfig/babel, Apple auth, healthCheck, flags | **APPROVED** |
| **1** Foundation | Violet tokens, V2 tabs, decluttered menu | **APPROVED** |
| **2** Explore | For You / Artists / Search | **APPROVED** |
| **3** Artist profile | Paper-safe copy; cinematic hero still backlog | **APPROVED WITH FOLLOW-UP** |
| **4** Paper trading | Wallet, trade, portfolio UI (local) | **APPROVED** (DB migrate next) |
| **5** Create | SP options gated; artist create kept | **APPROVED** |
| **6** Waitlist + analytics stub | Waitlist + `src/services/analytics.ts` | **APPROVED** |
| **7** Polish | a11y labels, chart lib, mini-player, tests, schema | **NEXT** |

---

## 7. Architecture rules

- Paper path **never** imports Stripe  
- Marketplace Stripe only if `MARKETPLACE_ENABLED`  
- Prefer feature services under `src/features/*`  
- Delete shims (`src/components` re-exports) only after import migration  
- Additive DB migrations only after live schema dump  

---

## 8. Next engineering priorities

1. Dump live Supabase schema → implement `paper_*` tables / RPCs  
2. Replace AsyncStorage wallet with server ledger  
3. Add chart library + real portfolio history  
4. Global audio controller + mini-player  
5. Accessibility labels on primary CTAs  
6. Seed Kaleb $10k demo project  

---

## 9. Key paths

```
src/config/featureFlags.ts
src/features/paper-trading/
src/features/explore/screens/ExploreScreen.tsx
src/features/waitlist/
src/styles/theme.ts
App.tsx  (V2 tabs + gated stacks)
```
