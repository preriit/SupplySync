# Mobile UX Wave 2

## Goal

Move from mobile functional parity to mobile-first usability.

## Principle

Fastest path to stock action.

### Typography

Follow the **type ladder** (bands, weights, when to use the top of a band) in [`frontend/public/DESIGN_SYSTEM.md`](../frontend/public/DESIGN_SYSTEM.md). On **web**, **Inter** is loaded as the primary font. On **native**, prefer **system sans** unless you explicitly bundle Inter; match **roles and hierarchy** (page title vs section vs body vs caption vs nav), not necessarily every pixel value.

## Primary user

Dealer / staff checking and updating stock.

## Core actions

1. Search product
2. View stock
3. Add stock
4. Reduce stock
5. See history

## Current state

- Wave 1 (keep as-is): functional flow is complete  
  `Login -> Dashboard -> Inventory -> Products -> Product detail -> Stock update`
- Wave 2 focus: make the same flow faster, more natural, and repeatable.

## Screens to upgrade

1. Dashboard
2. Inventory
3. Products list
4. Product detail
5. Stock update bottom sheet

## Finalized screen specifications

Authoritative UI decisions for Wave 2 implementation. When a screen is **locked**, implementation and QA should match this section unless a new revision is explicitly recorded.

### Dashboard (locked 2026-05-02)

#### Purpose

Dealer home: **fast orientation**, **find product** (search), **jump to stock work** (low stock, add product), **scan activity**, without duplicating the same job in two controls.

#### Layout (top to bottom)

1. **Header** — menu control, brand, notifications (see below).  
2. **Greeting** — personalized line + short subline (e.g. inventory snapshot tone).  
3. **Search** — **single** affordance: full-width **search bar** (placeholder e.g. name / SKU / size). **Filter control on the bar** (reference layout: filter button beside the field) is **Phase 2** — tracked in Dashboard tracker **#12**; ship bar + Go first, then filters when discovery UX is defined. **There is no separate “Search Product” quick tile** — removed to avoid duplicating the bar.  
4. **Quick actions** — **one horizontal row of three equal cards** (clean, scannable); tiles only for actions not duplicated elsewhere on this screen:  
   - **Add product** — inventory root (choose category, then add from product list).  
   - **Low stock** — stock alerts list (same logic as web / alerts; counts consistent with summary).  
   - **Browse inventory** — inventory root (categories).  
   - **No “Recent Updates” quick tile** — recent activity is only the **Recent activity** list below.  
   - Do **not** reintroduce a separate search tile or a second “activity” entry in this row.  
5. **Inventory summary** — horizontal metrics (e.g. Total / In stock / Low stock) with **View all** where it routes to a defined full list or filtered catalog; tapping **Low stock** number should match the same destination as the **Low Stock** quick tile when both are visible.  
6. **Recent activity** — vertical list (adds / reductions / key events) with timestamps; **View all** opens full activity / history surface. Naming may stay “Recent updates” in UI copy if preferred, but spec refers to **one** list — no duplicate tile above.

#### Header: notification bell

- **Intent:** lightweight **inbox** for things that need attention or acknowledgment — not a full duplicate of the entire activity feed.  
- **Suggested content types:** stock / inventory alerts (e.g. low, out of stock), success or failure of stock updates (with retry where applicable). Optional later: account / team messages.  
- **Badge:** should reflect **actionable or unread attention** (alerts + failures), not every line shown in Recent activity — otherwise the badge is ignored.  
- **Tap:** opens **notification list** (or filtered activity with “needs attention” at top). If no backend exists yet, **hide bell** or tie badge only to data you already have (do not show a permanent fake count).

#### Header: hamburger (three lines)

- **Intent:** **secondary and account** destinations — not a second copy of primary tabs.  
- **Typical items:** profile / account, settings, team (if role allows and not in tabs), help or support link, **logout**.  
- **Avoid:** repeating Dashboard, Inventory, or search here when those exist on the home layout or bottom tabs.
- **Shipped implementation (`apps/mobile`, 2026-05-02):** Slide-out `DealerMenuSheet` mirrors web dealer sidebar **color** (`#0B1F3A` family, translucent pane over scrim). Each row has a **small Ionicons glyph** (same vocabulary as the bottom tab bar where relevant). Rows: **Dashboard**, **Inventory**, **Recent activity**, **Profile**, **Log out** (logout stays drawer-only). Some overlap with tabs is intentional for desktop parity and quick jumps from any screen.

#### Bottom navigation

- **Principle:** tabs are **real, frequent dealer destinations** only — no placeholder tabs.  
- **Recommended set:** **Dashboard**, **Inventory**, optional dedicated **Alerts** / **Low stock** tab **if** it is a real screen distinct enough from Dashboard shortcut; **More** for settings, team, reports (only if shipped), logout, and any lower-frequency routes.  
- **Orders / Reports:** include **only** when dealer-facing features exist in the build; otherwise omit from the bar and surface under **More** or ship later. Prefer **four strong tabs + More** over five tabs with stubs.
- **Shipped implementation (2026-05-02):** `DealerTabBar` uses **four tabs — Dashboard, Inventory, Reports, Profile** (reports wired where dealer APIs exist). Low stock / activity remain dashboard shortcuts or pushed routes, not separate tab stubs. **More** tab screen removed in favor of **Profile** in the bar plus drawer for logout and activity.

#### Wave 2 alignment

- **Principle:** fastest path to stock action — search bar + Low Stock tile + summary numbers support that without redundant tiles.  
- **One-handed / tap budget:** document in the Dashboard tracker row after build (e.g. Low Stock → list in one tap from tile).

---

## Upgrade scope (Wave 2)

### 1) Dashboard (action-first)

Summary (full spec: **Finalized screen specifications → Dashboard** above):

- **Search:** search **bar only**; **no** “Search Product” quick tile (removed).  
- **Quick actions:** **one row, three cards** — Add product, Low stock, Browse inventory; **no** “Recent Updates” quick tile (activity is list + View all only).  
- **Sections:** greeting, search bar, quick actions, inventory summary, recent activity list.  
- **Chrome:** notification bell, hamburger, bottom tabs — per finalized Dashboard section.

### 2) Inventory cards (more visual)

Each card should show:

- Subcategory name
- Size
- Product count
- Stock health
- Quick tap area

### 3) Products list (image-first)

Each product card should show:

- Image
- Product name
- `Brand | Size | Surface`
- Stock badge
- Add Stock / Reduce Stock actions

### 4) Product detail (bottom actions)

Use sticky bottom actions so users do not need to scroll for operations:

- Add Stock
- Reduce Stock
- Edit

### 5) Stock update interaction (bottom sheet)

On Add/Reduce tap, open bottom sheet with:

- Quantity
- Note
- Confirm

## Mobile success rule

One-handed, 3-tap inventory update.

Target flow:

`Open app -> Search product -> Tap Add Stock -> Confirm`

---

## Screen-by-screen finalization tracker

Use this **top to bottom** by screen. After each screen pass, tick boxes and add one line to **Progress log** at the bottom.

### How we measure the success rule

- **Target:** After the correct product is on screen, reaching **Confirm** on Add/Reduce stock should take about **three deliberate taps** (e.g. open sheet → adjust if needed → confirm). Typing in search does not count the same way as stock confirmation taps.
- **Flag for redesign** any frequent path that needs **five or more** taps, **scroll to find** the primary action, or **tiny-only** controls for critical stock actions.

### Implementation order (user flow)

1. Dashboard  
2. Inventory (subcategories)  
3. Products list  
4. Product detail  
5. Stock update bottom sheet  

---

### 1) Dashboard — tracker

**Tap budget (document):** **2026-05-03** — Open app → **Low stock** or **Browse inventory** or **Add product** tile = **one tap** to the next screen. **Search:** one tap focuses the bar; **Go** routes to search results. No extra “search tile.”

| # | Acceptance | Done |
|---|------------|------|
| 1 | **Quick row:** all three cards (**Add product**, **Low stock**, **Browse inventory**) in **one line**; each has **one obvious tap** (large hit area, clear label). | [x] |
| 2 | **No** duplicate “Search Product” tile — **search bar only** for find-product (locked 2026-05-02). | [x] |
| 3 | **No** duplicate “Recent Updates” tile — **recent activity list + View all** only (locked 2026-05-02). | [x] |
| 4 | **Low Stock** tile and summary **View all** / low-stock metric tap land on the **correct** filtered list (no dead ends); consistent with Inventory / APIs. | [x] |
| 5 | **Recent activity** list **View all** opens the full activity / history surface; content type documented. | [x] |
| 6 | **Search** bar: one tap to focus; results route consistent with Inventory / product search elsewhere. | [x] |
| 7 | **Notifications:** bell behavior and badge rules match finalized spec (or bell hidden until data exists). | [x] |
| 8 | **Hamburger:** secondary/account items only; does not duplicate primary nav. | [x] |
| 9 | **Bottom tabs:** no placeholder tabs; matches finalized tab policy. | [x] |
| 10 | **One-handed:** favor critical actions in the **lower half** where possible; avoid only top-corner reliance for main dealer tasks. | [x] |
| 11 | No duplicate paths that **disagree** with Inventory (counts, filters, naming). | [x] |
| 12 | **Phase 2 — Search bar filter:** Add the **filter** affordance on the dashboard search bar (match reference: control adjacent to search / Go). Scope behavior when implementing (sheet vs presets, parity with Inventory search filters, API). | [ ] |

**Exit:** Dealer can use **search bar**, **Low Stock**, and **Add Product** without hunting; no redundant search or activity tiles.

---

### 2) Inventory (subcategories) — tracker

**Tap budget (document):** **2026-05-03** — **One tap** on a subcategory **card** opens that category’s **products** list (`/inventory/[id]/products`). Grid is **two columns** (`numColumns={2}`), fixed card width **48.6%** + `space-between` so the last odd tile does not stretch.

| # | Acceptance | Done |
|---|------------|------|
| 1 | **Whole card** (or one clear primary region) opens the category — one tap from grid. | [x] |
| 2 | Stock health badges use the **same logic** as web / alerts so users trust labels. | [x] |
| 3 | **One-handed:** scroll + thumb-friendly card height; filters don’t bury the grid behind extra steps unless necessary. | [x] |
| 4 | Optional filter / “All subcategories” remains discoverable and reversible. | [ ] |

**Exit:** One tap from a category card to the products list for that category.

---

### 3) Products list — tracker

**Tap budget (document):** **2026-05-03** — **Stock updates are detail-first:** tap **product row** → **product detail** → qty field + **+** / **−** on the **stock strip** (no **+/−** on the list row). Deliberate tap count after the row is visible is **>3** until list-row quick actions or a true bottom sheet exists; track as follow-up vs **Mobile success rule**.

| # | Acceptance | Done |
|---|------------|------|
| 1 | Fastest stock path is **written down** (with or without opening detail) and meets the **~3 tap** rule after the product row is visible. | [ ] |
| 2 | **+/−** (if on list) hit areas meet **~44×44 pt** minimum; not only tiny icons. | [ ] |
| 3 | Image + metadata layout does **not** shrink primary tap targets. | [x] |
| 4 | Stock badge / copy matches **truth** from API (same as detail). | [x] |
| 5 | **Sort** and **Filter** are **separate** controls: **Sort** sheet (apply on tap: name / quantity options); **Filter** sheet (stock + surface, **Apply** / **Reset**); badges reflect non-default sort vs active filters; subtitle documents both. | [x] |

**Exit:** Stock update from list (or list → detail) is measured and acceptable.

---

### 4) Product detail — tracker

**Tap budget (document):** **2026-05-03** — Stock strip (**+** / **−** + qty) lives **in the scroll body** (compact strip), not a pinned footer — **sticky bottom row not shipped**; revisit for acceptance **#1** / **#4**.

**Shipped in this pass (for QA / parity):** `DealerAppBar` + `DealerTabBar` (`current="inventory"`), header **title = product name**, **brand** (and other fields) in info block, **1–3 images** (hero + thumbnails + **full-screen swipe** gallery modal), **recent transactions** preview (20 rows) + **View all** → dedicated **transactions** route, `TXN_PREVIEW_LIMIT` aligned with policy doc.

| # | Acceptance | Done |
|---|------------|------|
| 1 | **Sticky bottom actions:** Add Stock, Reduce Stock, Edit — no scroll to find primary ops. | [ ] |
| 2 | **Add / Reduce** remain visually primary; Edit is secondary but clear. | [ ] |
| 3 | Share / overflow are **secondary** and do not compete with stock CTAs. | [ ] |
| 4 | Long content scrolls; **stock actions** stay fixed. | [ ] |
| 5 | **Phase 2 — Full-screen product gallery:** **Pinch-zoom** on photos in the image modal (e.g. `react-native-gesture-handler` + Reanimated). **Safe-area** layout for the **close** control on notched devices so it is reachable and not clipped. | [ ] |

**Exit:** Add/Reduce always visible; confirm path stays short.

---

### 5) Stock update (bottom sheet) — tracker

**Tap budget (document):** **Confirm** is always **one obvious tap**; optional fields never block confirm.

| # | Acceptance | Done |
|---|------------|------|
| 1 | Sensible **default quantity** (e.g. 1 or last-used) so confirm is not blocked by forced stepper taps. | [ ] |
| 2 | **Confirm** is full-width, high contrast; dismiss is safe (no accidental confirm). | [ ] |
| 3 | Keyboard / stepper layout does **not** cover Confirm on small phones. | [ ] |
| 4 | Note / reference optional; validation errors are readable and fixable **one-handed**. | [ ] |

**Exit:** Confirm add/reduce is one clear tap; optional fields stay optional.

---

### How to run each screen pass

| Step | Action |
|------|--------|
| 1 | **Freeze scope** for that screen only (copy, components, nav targets). |
| 2 | **Paper or Figma tap count:** happy path + “wrong category” recovery. |
| 3 | **Implement** in `apps/mobile` using shared tokens aligned with `frontend/public/DESIGN_SYSTEM.md`. |
| 4 | **Device test:** one phone (tablet pass when layout changes). |
| 5 | **Log** one line in **Progress log** below (shipped + any tap-budget tradeoff). |

---

## Up next (scheduled work)

Use this as the handoff list for the next session (e.g. **2026-05-04**).

### 1) Reports — multiple report types

**Shipped (2026):** `GET /dealer/dashboard/products-list` supports **`fast_moving`**, **`slow_moving`**, **`overstocked`**, **`high_momentum`** (logic in `backend/services/dealer_product_reports.py`). Aliases **`fast_movers`** → fast_moving, **`dead_stock`** → slow_moving keep the web DealerDashboard “View all” URLs working. Mobile `reports.js` uses a **2x2 tile selector** for all four types.

**Next:** Optional caps/thresholds per merchant, stock **value** on dead/overstock (needs cost data), and category-relative high momentum.  
**Vision (planned metric layer):** add **regional/category baseline averages** (e.g. `regional_avg_per_day`, `category_lifetime_avg_per_day`) so dealer movement can be compared against market context, not only self-history.
**Contract (authoritative):** see `docs/contracts/RPT-ADAPT_adaptive-dealer-reports.md` for formulas, peer baseline logic, compatibility keys, and rollout constraints.

### 2) Screen title flash — addressed

**Issue:** Products list showed **“Products”** then the real subcategory name; product detail showed **“Product details”** then the real name.

**Approach shipped:** Optional query params **`subcategoryName`** / **`productName`** on navigation from inventory, search, products list, reports, and stock alerts; **clear stale** `subcategory` / `product` at fetch start; show a **small title-area spinner** when loading with no hint yet. API remains source of truth once loaded.

---

## Progress log

| Date | Note |
|------|------|
| 2026-05-02 | **Dashboard design locked** in *Finalized screen specifications*: search **bar only** (Search Product tile removed); **Recent Updates** quick tile removed; activity via **list + View all**; notifications, hamburger, bottom tabs, summary; quick actions as **one row of three cards** (Add product, Low stock, Browse inventory). |
| 2026-05-02 | **Dashboard implemented** in `apps/mobile` (`dashboard.js`, `DealerTabBar`, `search`, `stock-alerts`, `activity`, `more`); inventory tab uses same bottom bar. Backend: `build_recent_activity_feed` + `GET /dealer/dashboard/recent-activity` for View all activity. |
| 2026-05-02 | **Dealer shell:** `DealerAppBar`, `DealerStackHeader`, `DealerMenuSheet` (navy translucent drawer + row icons), `DealerTabBar` (four tabs, navy `#0B1F3A`, orange active). **Profile** and **Reports** screens; **More** removed; drawer carries **Log out**. Shared headers on dealer stacks (`dashboard`, `inventory`, `search`, `stock-alerts`, `activity`). |
| 2026-05-03 | **Phase 2 scope (mobile):** Product detail ships **hero + thumbnails (1–3)** and **full-screen swipe gallery**; defer **pinch-zoom** (gesture-handler + Reanimated) and **modal close safe-area** on notched devices — tracked under Product detail tracker **#5**. |
| 2026-05-03 | **Dashboard tracker:** Rows **1–11** marked **done** (quick row, search bar only, activity list + View all, low-stock routing, notifications pane + badge rules, drawer, four-tab bar, one-handed bias as implemented). **#12** (search bar filter on Dashboard) remains **Phase 2 / open**. |
| 2026-05-03 | **Inventory (subcategories):** Two-column grid, **Healthy** = green, card width **48.6%** + row `space-between`; whole-card navigation to products list. Optional **#4** (global “all subcategories” filter) **not** in UI yet. |
| 2026-05-03 | **Products list:** Dealer list shell (search, count line, grouped list rows with image + meta + stock badge). **Sort \| Filter** split: separate bottom sheets; sort **apply-on-tap**; filter **Stock** + **Surface** with **Apply** / **Reset**; badges on each control. **Tap budget:** stock change remains **list → detail → strip** (see Products list tracker). |
| 2026-05-03 | **Product detail + transactions route:** Gallery (hero/thumbs/modal swipe), transaction preview cap + **View all** full history screen, relative import depth fixed for nested route. **Sticky** stock/footer actions still **open** (strip in-scroll). |
| 2026-05-03 | **Stock alerts / Recent activity:** Parity tweaks (threshold copy **20** + **boxes**, **Out of stock** labeling, **Clear all** when actionable, digest/helper alignment with dashboard). |
| 2026-05-03 | **Header title flash:** Products list and product detail avoid placeholder titles during load (`subcategoryName` / `productName` query hints from navigators; clear stale entity on refetch; spinner in title when no hint). Delete product → replace to list preserves **`subcategoryName`** when API provides `sub_category_name`. **Up next** section added for **multi-type reports**. |
| 2026-05-05 | **Adaptive report engine documented:** Added authoritative contract `docs/contracts/RPT-ADAPT_adaptive-dealer-reports.md` covering peer grouping (size-aware via subcategory), baseline medians/percentiles, adaptive cutoffs, list-type rules, compatibility keys, and planned regional benchmark evolution. |
| _(add a line after each screen or session)_ | |

