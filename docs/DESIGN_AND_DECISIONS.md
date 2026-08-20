# MusiStash V2 — Design System & Founder Decisions

---

## 1. Design direction (selected: A)

**Premium dark + violet** — cultural, musical, trustworthy (not crypto neon).

| Token | Value |
|-------|-------|
| Background | `#070709` |
| Surface / card | `#121216` |
| Text primary | `#F5F5F7` / `#FCFCFD` |
| Text secondary | `#A1A1AA` / `#B5B5BA` |
| Brand accent | `#8B5CF6` |
| Accent soft | `#A78BFA` |
| Accent dark | `#7C3AED` |
| Positive (portfolio only) | `#22C55E` |
| Negative (portfolio only) | `#EF4444` |
| Warning | `#F59E0B` |
| Border | `#2A2A33` / `#454648` |

Implemented in `src/styles/theme.ts` (Direction A comment). Legacy `purple*` aliases now map to real violet (previously aliased to blue).

### Alternatives (not selected)

- **B** Keep blue `#3B82F6` — lower churn, less distinctive  
- **C** Warm ink + amber — editorial, weaker “trading” familiarity  

### Typography

- Display / portfolio numbers: bold, tabular nums  
- UI: readable 16/14/12; disclosures ≥12  
- Add Expo custom fonts in polish (Manrope / Plus Jakarta — avoid generic Inter-only look)

### Motion

- Fast (120–280ms), interruptible, reduced-motion cuts  
- Reanimated enabled via Babel plugin; prefer it over decorative RN Animated sprawl  

### Components (build incrementally)

PortfolioValueHeader, PortfolioChart, PositionCard, PaperDisclosure, ArtistHero, FeedCard, TradeReviewSheet, WaitlistCTA, MiniPlayer, Skeleton, Empty/Error  

---

## 2. UX copy rules

- Prefer: Paper Money, Simulated Funds, Practice Backing, Hypothetical Return, Simulated Position  
- Avoid: Invest Now, Own equity, Guaranteed ROI, Escrow of real funds (unless marketplace flag on)  
- Scores: always “signal / not a guarantee”

---

## 3. Founder decisions

Respond in-line or update the **Response** column.

| ID | Decision | Options | Recommendation | Response |
|----|----------|---------|----------------|----------|
| D-01 | Starting paper balance | 10k / 5k / 1k | **$10,000** | Pending |
| D-02 | Participation model | Units / revenue points / credits | **Units** + separate scenario calc | Pending |
| D-03 | Valuation model v1 | Accept / flat / manual | **Accept v1** | Pending |
| D-04 | Early close positions | No / anytime / milestones | **No in V2** | Pending |
| D-05 | Marketplace in app | Flag off / remove / keep dual | **Flag off** (current) | Pending |
| D-06 | DMs in first release | Exclude / keep / artist-only | **Exclude** (current flag) | Pending |
| D-07 | Fan + artist one account | Yes / separate | **Yes** | Pending |
| D-08 | Comments | Keep / likes only | **Keep** | Pending |
| D-09 | Logged-out browse | Auth wall / public / preview | **Limited preview** | Pending |
| D-10 | Artist customization | Accent+media / full theme / none | **Accent + media** | Pending |
| D-11 | Public metrics | % goal vs raw $ | Show counts + scores; label simulated $ | Pending |
| D-12 | Ship Resonance scores | With limits / internal / rebuild | **Ship with limitations** | Pending |
| D-13 | Primary waitlist CTA | After first trade / follows / all | **After first trade** + secondary | Pending |
| D-14 | Demo platform fee | 5% fan pool / funding / 0% | **5% of fan pool** | Pending |
| D-15 | Brand accent | Violet / blue / warm | **Violet (done)** | Pending |

---

## 4. Agent operating notes

- Fable reviews/approves phase gates; specialists get task packets only  
- Durable memory = these **3 docs only** (older audit/plan files removed)  
- Parallel agents must not own the same files  
- Paper trading and auth/migrations need independent review before production  

---

## 5. Phase 7 polish checklist

- [ ] accessibilityLabel on icon buttons / tabs  
- [ ] Chart dependency spike + interactive portfolio graph  
- [ ] Mini-player + single audio focus  
- [ ] Server paper ledger + seed data  
- [ ] Jest smoke tests for wallet math  
- [ ] Remove unused deps (Elements, unused Google Sign-In native) when safe  
- [ ] Consolidate logo assets  
