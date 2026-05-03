# Mobile UX Wave 2

## Goal

Move from mobile functional parity to mobile-first usability.

## Principle

Fastest path to stock action.

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
3. **Search** — **single** affordance: full-width **search bar** (placeholder e.g. name / SKU / size); optional filter control on the bar if product discovery needs it. **There is no separate “Search Product” quick tile** — removed to avoid duplicating the bar.  
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

#### Bottom navigation

- **Principle:** tabs are **real, frequent dealer destinations** only — no placeholder tabs.  
- **Recommended set:** **Dashboard**, **Inventory**, optional dedicated **Alerts** / **Low stock** tab **if** it is a real screen distinct enough from Dashboard shortcut; **More** for settings, team, reports (only if shipped), logout, and any lower-frequency routes.  
- **Orders / Reports:** include **only** when dealer-facing features exist in the build; otherwise omit from the bar and surface under **More** or ship later. Prefer **four strong tabs + More** over five tabs with stubs.

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

**Tap budget (document):** e.g. open app → **Low Stock** tile or **search** focus → next screen in **one tap** (tile) or type-to-results (search). Fill after implementation.

| # | Acceptance | Done |
|---|------------|------|
| 1 | **Quick row:** all three cards (**Add product**, **Low stock**, **Browse inventory**) in **one line**; each has **one obvious tap** (large hit area, clear label). | [ ] |
| 2 | **No** duplicate “Search Product” tile — **search bar only** for find-product (locked 2026-05-02). | [ ] |
| 3 | **No** duplicate “Recent Updates” tile — **recent activity list + View all** only (locked 2026-05-02). | [ ] |
| 4 | **Low Stock** tile and summary **View all** / low-stock metric tap land on the **correct** filtered list (no dead ends); consistent with Inventory / APIs. | [ ] |
| 5 | **Recent activity** list **View all** opens the full activity / history surface; content type documented. | [ ] |
| 6 | **Search** bar: one tap to focus; results route consistent with Inventory / product search elsewhere. | [ ] |
| 7 | **Notifications:** bell behavior and badge rules match finalized spec (or bell hidden until data exists). | [ ] |
| 8 | **Hamburger:** secondary/account items only; does not duplicate primary nav. | [ ] |
| 9 | **Bottom tabs:** no placeholder tabs; matches finalized tab policy. | [ ] |
| 10 | **One-handed:** favor critical actions in the **lower half** where possible; avoid only top-corner reliance for main dealer tasks. | [ ] |
| 11 | No duplicate paths that **disagree** with Inventory (counts, filters, naming). | [ ] |

**Exit:** Dealer can use **search bar**, **Low Stock**, and **Add Product** without hunting; no redundant search or activity tiles.

---

### 2) Inventory (subcategories) — tracker

**Tap budget (document):** **one tap** from a category card into that category’s products list.

| # | Acceptance | Done |
|---|------------|------|
| 1 | **Whole card** (or one clear primary region) opens the category — one tap from grid. | [ ] |
| 2 | Stock health badges use the **same logic** as web / alerts so users trust labels. | [ ] |
| 3 | **One-handed:** scroll + thumb-friendly card height; filters don’t bury the grid behind extra steps unless necessary. | [ ] |
| 4 | Optional filter / “All subcategories” remains discoverable and reversible. | [ ] |

**Exit:** One tap from a category card to the products list for that category.

---

### 3) Products list — tracker

**Tap budget (document):** State explicitly whether **+/−** is on the **row** (path: row → sheet → confirm) or **detail-only** (path includes open detail). Measure on a real phone.

| # | Acceptance | Done |
|---|------------|------|
| 1 | Fastest stock path is **written down** (with or without opening detail) and meets the **~3 tap** rule after the product row is visible. | [ ] |
| 2 | **+/−** (if on list) hit areas meet **~44×44 pt** minimum; not only tiny icons. | [ ] |
| 3 | Image + metadata layout does **not** shrink primary tap targets. | [ ] |
| 4 | Stock badge / copy matches **truth** from API (same as detail). | [ ] |

**Exit:** Stock update from list (or list → detail) is measured and acceptable.

---

### 4) Product detail — tracker

**Tap budget (document):** From this screen, **Add stock → Confirm** in **two taps** after arrival, when quantity default is sensible (open sheet + confirm).

| # | Acceptance | Done |
|---|------------|------|
| 1 | **Sticky bottom actions:** Add Stock, Reduce Stock, Edit — no scroll to find primary ops. | [ ] |
| 2 | **Add / Reduce** remain visually primary; Edit is secondary but clear. | [ ] |
| 3 | Share / overflow are **secondary** and do not compete with stock CTAs. | [ ] |
| 4 | Long content scrolls; **stock actions** stay fixed. | [ ] |

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

## Progress log

| Date | Note |
|------|------|
| 2026-05-02 | **Dashboard design locked** in *Finalized screen specifications*: search **bar only** (Search Product tile removed); **Recent Updates** quick tile removed; activity via **list + View all**; notifications, hamburger, bottom tabs, summary; quick actions as **one row of three cards** (Add product, Low stock, Browse inventory). |
| 2026-05-02 | **Dashboard implemented** in `apps/mobile` (`dashboard.js`, `DealerTabBar`, `search`, `stock-alerts`, `activity`, `more`); inventory tab uses same bottom bar. Backend: `build_recent_activity_feed` + `GET /dealer/dashboard/recent-activity` for View all activity. |
| _(add a line after each screen or session)_ | |

