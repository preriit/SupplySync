# Mobile and tablet-first plan and tracker

**Assumption:** Most **dealers** use **phones and tablets** (touch-first devices). The **website** stays important for **admins** and occasional desktop use, but dealer-facing work should default to **`apps/mobile`** — optimized for **both** pocket and tablet form factors, not phone-only layouts.

**Related:** Migration steps through Step 15 are closed — see `docs/single-codebase-migration-plan.md`. This document is what you run **after** that.

---

## How to use this file

1. Work **top to bottom** by phase; finish or consciously skip a box before pretending the phase is done.
2. After each session, add one line to **Progress log** at the bottom.
3. Keep **no more than one or two “big” goals in progress** at a time.

---

## Principles (simple rules)

1. **Dealer-facing feature?** Design and build for **`apps/mobile` first** (phones **and** tablets). Copy changes to web **only if you still need desktop parity**.
2. **Shared behavior** (API shapes, login, validation, tokens): prefer **`packages/core`** so you do not fix the same bug twice.
3. **Screens** still live in two places today (`frontend` vs `apps/mobile`) — that is normal until you choose a long “one UI” migration later.
4. **You cannot credibly pilot or launch dealer flows without a deliberate native-app UI baseline (phones + tablets).** APIs and builds are necessary but not sufficient; inconsistent colors, tiny tap targets, and mystery navigation erode trust faster than a flaky endpoint. Treat **Mobile & tablet UI baseline** (below) as part of readiness, not an afterthought.

---

## UI references (where to look)

| Layer | Purpose | Reference |
|-------|---------|-----------|
| **Brand, palette, hierarchy, component intent (web-authored)** | Single source for **what SupplySync should feel like** — primary orange, slate structure, status colors, spacing philosophy | `frontend/public/DESIGN_SYSTEM.md` |
| **Web implementation** | Tailwind / shadcn screens, admin | `frontend/src/` |
| **Native app implementation** | Dealer RN screens and navigation for **phones and tablets** | `apps/mobile/` |
| **Shared UI package (optional growth)** | Cross-cutting primitives when you intentionally extract them | `packages/ui/` |

**How to use `DESIGN_SYSTEM.md` in the native app:** mirror **semantics**, not every web pixel — same primary action color, same structural text color, same success/warning/danger meaning, **typography roles from the type ladder** (page vs section vs body vs caption; Inter on web, system sans acceptable on native unless you bundle Inter), consistent card/list rhythm and touch-friendly density on **both phone and tablet widths**. New dealer-facing screens should **start from** those tokens (today many hex values are duplicated per file in `apps/mobile`; consolidating into one theme module is a baseline task below).

---

## Mobile & tablet UI baseline — blocking for pilot-ready

**Goal:** Dealers see **one coherent product** on **phones and tablets**: recognizable brand, readable type, predictable CTAs, sensible use of wider tablet canvas (no absurd stretch or microscopic margins), and obvious recovery when something fails.

Complete this block **before** you call Phase 1 “done,” or explicitly note in Progress log what you deferred and why.

| # | Task | Done |
|---|------|------|
| 1 | Read **`frontend/public/DESIGN_SYSTEM.md`** and list **native-app-applicable** items (palette, type scale intent, status colors, spacing rules) in Progress log or a short PR description | [ ] |
| 2 | **Centralize app tokens** — one module under `apps/mobile/` (e.g. colors, radii, spacing constants) aligned with DESIGN_SYSTEM palette; refactor **new/changed** screens to use it (full repo sweep can follow) | [ ] |
| 3 | **Touch targets:** primary actions and list rows meet ~44×44 pt minimum on phones and tablets; no critical action only as tiny icon-only control without affordance | [ ] |
| 4 | **Tablet pass:** run core flows on a **tablet** (or emulator): readable max-width / padding where lists would otherwise span edge-to-edge awkwardly; no clipped dialogs or headers | [ ] |
| 5 | **Navigation:** back/title hierarchy obvious on dealer flows; user never “stuck” without logout or home path where expected | [ ] |
| 6 | **States:** loading, empty, and error patterns consistent (copy tone + retry path) on dashboard, inventory list, product detail | [ ] |
| 7 | **Accessibility baseline:** labels on important icons/buttons where meaning isn’t obvious from text alone; sufficient contrast on primary buttons vs background | [ ] |
| 8 | **Pilot polish pass:** walk core flow with DESIGN_SYSTEM open — fix **top 5** visual inconsistencies (wrong gray, mixed radii, orphaned headers) | [ ] |

**Exit:** A neutral dealer could open the app on **a phone or tablet** and infer “same company as the web product” without reading your docs.

---

## Phase 1 — Native app pilot ready (internal / small cohort)

**Goal:** Dealers can run daily flows on **phones and tablets** without you babysitting every session.

| # | Task | Done |
|---|------|------|
| 1 | **Mobile & tablet UI baseline** (section above) complete or consciously deferred with logged rationale | [ ] |
| 2 | Confirm **`npm run validate`** is green on `main` after changes | [ ] |
| 3 | Pick **production-like API URL** for pilot builds (`EXPO_PUBLIC_BACKEND_URL`) | [ ] |
| 4 | Run manual smoke on **real device(s)** — at least **one phone** and, when possible, **one tablet**: login → dashboard → inventory → product → edit → stock → create/delete (as you use today) | [ ] |
| 5 | Write down **top 3 confusing UX issues** from pilot (even bullets in Progress log) | [ ] |
| 6 | Decide pilot **cohort size** (e.g. 3–10 dealers) and **who owns support** | [ ] |

**Phase 1 exit:** Pilot cohort can complete core flows without blockers you cannot fix within a day **and** the app presents a coherent **phone + tablet** UI (baseline met or documented exception).

---

## Phase 2 — Installable app (beyond Expo Go)

**Goal:** Users install **your** app (or a closed test track), not “open Expo Go and scan.”

| # | Task | Done |
|---|------|------|
| 1 | Choose path: **EAS Build** (recommended with Expo) vs other — record choice here: _______________ | [ ] |
| 2 | **Android:** Play Console internal / closed testing track, signing, first upload | [ ] |
| 3 | **iOS (if needed):** Apple Developer, TestFlight, first build | [ ] |
| 4 | Document **how to update** the app (build number, who triggers build) in one paragraph below Progress log | [ ] |
| 5 | Smoke-test **installed** build against production-like backend | [ ] |

**Phase 2 exit:** At least one platform has an install path you trust for non-developers.

---

## Phase 3 — Dealer parity “only where it hurts”

**Goal:** Close gaps that cause **support tickets**, not every pixel of the web app.

| # | Task | Done |
|---|------|------|
| 1 | List **top dealer complaints** vs web (e.g. missing images, missing report) — max 5 items | [ ] |
| 2 | For each item: **one vertical slice** PR (mobile + core if needed + minimal web only if required) | [ ] |
| 3 | Add or extend **manual smoke** steps when you ship a slice | [ ] |

**Phase 3 exit:** No recurring “I can’t do X on **my phone or tablet**” for your top workflows.

---

## Phase 4 — Web admin and stability (ongoing)

**Goal:** Internal teams are not blocked; web stays secure and deployable.

| # | Task | Done |
|---|------|------|
| 1 | After admin changes: quick **smoke** (login, users, merchants, reference data, one analytics click) | [ ] |
| 2 | Keep **PR checks green**; fix CI breaks before merging piles of features | [ ] |

*(Treat this as “always on,” not a one-time phase.)*

---

## Phase 5 — Optional future: one UI codebase

**Goal:** Eventually **one screen codebase** for dealer web + mobile (big investment).

**Do not start** until Phase 1–2 feel boring and stable.

| # | Task | Done |
|---|------|------|
| 1 | Written decision: canonical dealer UI is **`apps/mobile`** (+ web export), CRA **`frontend`** shrinks over time | [ ] |
| 2 | Spike: one dealer screen on **Expo web** at production quality | [ ] |
| 3 | Migration plan by **slice** (not big bang) | [ ] |

---

## Weekly rhythm (15 minutes)

Fill every Friday (or Monday):

- **This week shipped:** …  
- **Mobile / tablet pilot issues:** …  
- **Next week one priority:** …  
- **`npm run validate` on main:** pass / fail  

---

## Progress log

| Date | Note |
|------|------|
| _(example)_ 2026-05-01 | Plan file created; migration checklist complete on main |
| 2026-05-03 | Dealer mobile Wave 2 progress recorded in **`docs/MOBILE_UX_WAVE2.md`** (screen trackers + progress log): dashboard rows 1–11 done, inventory grid, products **Sort** / **Filter**, product detail gallery + transaction preview/history route, stock-alerts/activity copy parity; open items called out there (e.g. dashboard search filter #12, sticky detail actions, list-row stock path). |
| | |

---

## Links

- **Design system (brand + UI rules):** `frontend/public/DESIGN_SYSTEM.md`
- Single-repo migration acceptance: `docs/single-codebase-migration-plan.md`
- Step 15 manual smoke reference: `docs/MIGRATION_STEP15_PENDING_MANUAL_TESTS.md`
- Beta-style checklist (when you widen rollout): `docs/BETA_READINESS_CHECKLIST.md`
- Active engineering slices: `docs/module-tracklist.md`
