# 🎨 SupplySync Design System - "Tactile Clarity"

## Design Philosophy

**"Tactile Clarity"** - A design system inspired by the physical nature of tiles: clean lines, matte textures, and structural solidity. Balances industrial reliability with consumer-grade usability.

---

## 🎨 Color Palette

### Primary Colors

**Burnt Orange (Action Color)**
- Hex: `#EA580C`
- Usage: Primary buttons, CTAs, active states, important highlights
- Inspiration: Fired clay/terracotta - evokes the tile industry
- High visibility against neutral backgrounds

**Mineral Slate (Structure Color)**
- Hex: `#0F172A`
- Usage: Headers, text, navigation, borders
- Conveys: Authority, stability, professionalism

### Background Colors

**Cool Grey Foundation**
- Light: `#F8FAFC` (main background)
- White: `#FFFFFF` (cards, panels)
- Purpose: Lets product images and data pop

### Status Colors

**Success (In Stock)**
- Color: `#10B981` (Emerald)
- Usage: Stock availability, approved orders, success messages

**Warning (Limited Stock)**
- Color: `#F59E0B` (Amber)
- Usage: Low stock alerts, pending requests

**Danger (Out of Stock / Rejected)**
- Color: `#EF4444` (Red)
- Usage: Out of stock, rejected orders, errors

**Info (Processing)**
- Color: `#3B82F6` (Blue)
- Usage: Processing states, information messages

---

## ✍️ Typography

### Primary font

**Inter** — one family for navigation, headings, body, and UI. Neutral, readable at small sizes, works across dealer dashboards and forms.

**Weights in use**

| Weight name | CSS value | Typical use |
|-------------|-----------|-------------|
| Regular | 400 | Body, captions, labels |
| Medium | 500 | Section titles, nav, table headers, badges |
| SemiBold | 600 | Page titles, buttons, empty-state titles |
| Bold | 700 | Data numbers / KPIs |

### Web sizing rule

Sizes in the ladder are **bands**, not fixed requirements. Pick any value **inside** a band per screen density, breakpoint, or product need. Preserve **hierarchy**: a lower role should not routinely look heavier or larger than the role above it (e.g. a caption should not compete with a section title).

### When to use the **top** of a size band

Prefer the **larger** end of the range when:

- Layout is **desktop / wide** and headings benefit from slightly more presence.
- The line is **short** (single-line title, KPI label + number).
- You are honoring **user scaling / accessibility** preferences.

Prefer the **smaller** end when:

- The surface is **dense** (tables, filters, multi-column admin).
- Text is **secondary** (helper lines under a primary label).
- **Vertical space** on mobile is tight, without shrinking body text below a comfortable minimum.

### Type ladder

| Element | Size (band) | Weight |
|---------|-------------|--------|
| Page title | 24–28px | SemiBold |
| Section title | 18–20px | Medium |
| Data numbers / KPIs | 20–28px | Bold |
| Body text | 14–16px | Regular |
| Labels | 12–13px | Regular |
| Buttons | 14–16px | SemiBold |
| Caption | 12–13px | Regular |
| Nav | 14–15px | Medium |
| Table header | 12–13px | Medium |
| Badge | 11–12px | Medium |
| Empty state title | 18–20px | SemiBold |

**KPI vs page title:** Data numbers may sit in the same numeric band as page titles; keep titles dominant with **weight** (SemiBold vs Bold on numbers is acceptable) and **copy length** — titles stay concise; KPIs stay numeric or short labels.

### Line-height (guidance)

- Page / section titles: **~1.2–1.25**
- Body: **~1.45–1.5**
- Caption / badge: **~1.3–1.4**

### Native app (`apps/mobile`)

**Inter** is loaded in `app/_layout.js` (weights 400–700). Use `FONT.regular` | `FONT.medium` | `FONT.semibold` | `FONT.bold` from `theme/typography.js` for weighted text so Android picks the correct face (avoid relying on `fontWeight` alone). Match **roles and hierarchy** from this ladder; pixel sizes follow the same bands where practical.

---

## 🧱 Component Library

### Navigation

**Dealer Navigation (Primary)**
- Dashboard | Inventory | Sub-dealers | Orders | Analytics
- Orange active indicator
- Icon + Text labels

**Sub-dealer Navigation (Primary)**
- Dashboard | Search | My Dealers | Orders | Profile
- Orange active indicator
- Search icon prominent

### Cards

**Product Card (Search Results)**
```
┌─────────────────────────┐
│  [Product Image]        │
│                         │
├─────────────────────────┤
│ Product Name            │
│ Brand • 12x12           │
│ ₹480/box                │
│ 🟢 In Stock             │
│ From: Dealer Name       │
│ [Add to Order Request]  │
└─────────────────────────┘

- Image: 16:9 aspect ratio
- Price: Bold, prominent
- Stock: Color-coded badge
- CTA: Orange button
```

**Dashboard KPI Card**
```
┌─────────────────────────┐
│ 📦 549                  │
│ Total Products          │
│ ↑ +23 this month        │
└─────────────────────────┘

- Large number: 36px bold
- Label: 14px regular
- Change indicator: Green ↑ or Red ↓
```

**Order Request Card (Dealer View)**
```
┌─────────────────────────────────────┐
│ Order #ORD-2026-001                 │
│ XYZ Traders • 2 hours ago           │
│ ────────────────────────────────────│
│ 3 items • Total: ₹83,780           │
│ Customer: Ravi Kumar               │
│ [Approve] [Reject] [View Details]  │
└─────────────────────────────────────┘

- Header: Order number + time
- Content: Key info
- Actions: Prominent buttons
```

### Buttons

**Primary (Burnt Orange)**
- Background: #EA580C
- Text: White
- Hover: Darken 10%
- Usage: Main actions (Submit, Approve, Add)

**Secondary (Slate Outline)**
- Border: #0F172A
- Text: #0F172A
- Hover: Light grey background
- Usage: Cancel, Back, View

**Success (Green)**
- Background: #10B981
- Usage: Approve, Confirm

**Danger (Red)**
- Background: #EF4444
- Usage: Delete, Reject

### Forms

**Input Fields**
- Border: Light grey (#E2E8F0)
- Focus: Orange border (#EA580C)
- Label: Above input, 14px medium
- Placeholder: Grey text
- Error: Red border + error message below

**Select Dropdowns**
- Same styling as inputs
- Chevron icon on right
- Options: Hover orange background

### Tables

**Data Table (Inventory, Orders)**
- Header: Slate background (#F1F5F9)
- Rows: Alternating white/grey
- Hover: Light orange tint
- Borders: Subtle grey lines
- Actions: Icon buttons on right

### Filters (Search Sidebar)

**Filter Section**
```
┌─────────────────────┐
│ Filters             │
│ ────────────────────│
│ □ Brand             │
│   □ Kajaria         │
│   □ Somany          │
│   □ Nitco           │
│                     │
│ □ Size              │
│   □ 12x12           │
│   □ 16x16           │
│                     │
│ □ Price Range       │
│   [====•====]       │
│   ₹0 - ₹1000       │
│                     │
│ [Clear] [Apply]     │
└─────────────────────┘

- Collapsible sections
- Checkboxes for multi-select
- Slider for price range
- Count badges (e.g., Kajaria (45))
```

---

## 📐 Layout Patterns

### Dealer Dashboard - "Control Tower" Bento Grid

```
┌─────────────────────────────────────────────────────┐
│  [Header: Logo • Navigation • User Menu]            │
├───────────────────┬─────────────┬───────────────────┤
│                   │             │                   │
│  Pending Orders   │  Revenue    │  Active           │
│  [Large Number]   │  This Month │  Sub-dealers      │
│  [Recent 3]       │  [Chart]    │  [Count]          │
│                   │             │                   │
├───────────────────┴─────────────┴───────────────────┤
│                                                      │
│  Order Requests Timeline [Chart]                    │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Recent Activity Feed                               │
│  • Sub-dealer X requested access                    │
│  • Order #123 approved                              │
│  • New product added                                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Key Features:**
- Hero element (top-left): Most urgent info (Pending Orders)
- Bento grid: Flexible, modern layout
- Charts: Visual trends
- Quick actions: Visible and accessible

### Sub-dealer Dashboard - "Quick Discovery"

```
┌─────────────────────────────────────────────────────┐
│  [Header: Logo • Navigation • User Menu]            │
├───────────────────┬─────────────────────────────────┤
│                   │                                 │
│  Search Box       │  Connected Dealers              │
│  [Prominent]      │  [5 Dealer Cards]              │
│                   │                                 │
├───────────────────┼─────────────────────────────────┤
│                   │                                 │
│  My Orders        │  Suggested Dealers              │
│  Pending: 2       │  [3 Suggestions]               │
│  [Recent 3]       │  [Request Access]              │
│                   │                                 │
└───────────────────┴─────────────────────────────────┘
```

**Key Features:**
- Search: Hero position (top-left)
- Connected dealers: Visual cards
- Order status: At a glance
- Discovery: Suggested dealers to expand network

### Multi-Dealer Search - "Split-Screen Discovery" ⭐ MOST CRITICAL

```
┌─────────────────────────────────────────────────────┐
│  [Header with Search Bar - Full Width]              │
├─────────────┬───────────────────────────────────────┤
│             │                                       │
│  FILTERS    │  SEARCH RESULTS                       │
│  (Sticky)   │                                       │
│             │  [Sort: Relevance ▼]  [Grid/List]    │
│  □ Brand    │                                       │
│  □ Size     │  ┌──────┐ ┌──────┐ ┌──────┐          │
│  □ Price    │  │ Prod │ │ Prod │ │ Prod │          │
│  □ Dealer   │  │  1   │ │  2   │ │  3   │          │
│  □ Stock    │  └──────┘ └──────┘ └──────┘          │
│             │                                       │
│  [Clear]    │  ┌──────┐ ┌──────┐ ┌──────┐          │
│  [Apply]    │  │ Prod │ │ Prod │ │ Prod │          │
│             │  │  4   │ │  5   │ │  6   │          │
│             │  └──────┘ └──────┘ └──────┘          │
│             │                                       │
│             │  [Load More]                          │
│             │                                       │
└─────────────┴───────────────────────────────────────┘
```

**Key Features:**
- **Sticky sidebar**: Filters always visible while scrolling
- **Full-width search bar**: Prominent, autocomplete
- **Grid/List toggle**: User preference
- **Sort options**: Relevance, Price, Stock
- **Product cards**: Image-first, clear dealer attribution
- **Infinite scroll** or pagination
- **Compare feature**: Select 2-3 to compare side-by-side

---

## 🎭 States & Interactions

### Loading States

**Skeleton Loaders**
- Use for: Product cards, tables, dashboard cards
- Color: Light grey animated shimmer
- Maintain layout structure

**Spinner**
- Use for: Button actions, form submissions
- Color: White (on orange buttons) or Orange (on page)
- Size: 20px standard

### Empty States

**No Products Found (Search)**
```
┌─────────────────────────────┐
│         🔍                  │
│                             │
│  No products found          │
│  Try adjusting your filters │
│                             │
│  [Clear Filters]            │
└─────────────────────────────┘
```

**No Orders Yet**
```
┌─────────────────────────────┐
│         📦                  │
│                             │
│  No orders yet              │
│  Start by searching for     │
│  products from dealers      │
│                             │
│  [Go to Search]             │
└─────────────────────────────┘
```

### Error States

**API Error**
- Red alert banner at top
- Message: Clear, actionable
- Action button: "Retry" or "Contact Support"

**Form Validation**
- Red border on invalid field
- Error message below field
- Icon: ⚠️ or ❌

### Success Feedback

**Toast Notifications** (Bottom-right)
```
┌─────────────────────────────┐
│ ✅ Order request submitted   │
│    Order #ORD-2026-045      │
└─────────────────────────────┘

- Auto-dismiss: 5 seconds
- Green background
- White text
```

**Success Page** (After major action)
```
┌─────────────────────────────┐
│         ✅                  │
│                             │
│  Order Request Sent!        │
│  Order #ORD-2026-045       │
│                             │
│  The dealer will review     │
│  your request shortly       │
│                             │
│  [View Order] [Back Home]   │
└─────────────────────────────┘
```

### Hover States

**Product Card Hover**
- Subtle scale (1.02)
- Shadow increase
- "Add to Order" button: Darker orange

**Button Hover**
- Primary: Darken 10%
- Secondary: Light grey background
- Transition: 200ms ease

**Table Row Hover**
- Background: Light orange tint (#FFF7ED)
- Transition: 150ms ease

---

## 📱 Responsive Behavior

### Breakpoints

```
Desktop Large:  1920px+  (Primary target)
Desktop:        1280px+  (Standard)
Tablet:         768px+   (Simplified)
Mobile:         < 768px  (Mobile-first stack)
```

### Mobile Adaptations

**Search Interface (Mobile)**
- Filters: Slide-out drawer (hamburger menu)
- Product cards: Single column, full width
- Search bar: Full width, sticky top

**Dashboard (Mobile)**
- Bento grid → Single column stack
- Navigation: Bottom bar (icons only)
- Charts: Simplified, horizontal scroll if needed

**Tables (Mobile)**
- Card view instead of table
- Show key columns only
- "View details" for full info

---

## 🎯 Design Priorities

### 1. Search Experience (CRITICAL)
- **Goal:** Sub-dealer finds product in <30 seconds
- **Features:** 
  - Instant results (as-you-type)
  - Smart filters (with counts)
  - Visual-first cards
  - Clear dealer differentiation
  - Easy "add to order" action

### 2. Dashboard Clarity
- **Goal:** Key metrics at a glance
- **Features:**
  - Information hierarchy (most important top-left)
  - Visual data (charts, not just numbers)
  - Actionable CTAs
  - Recent activity visibility

### 3. Professional & Trustworthy
- **Goal:** "I trust this with my business"
- **Approach:**
  - Clean, uncluttered layouts
  - Consistent styling
  - No flashy animations (subtle only)
  - Industry-appropriate colors

### 4. Speed Perception
- **Goal:** Feels fast even if not instant
- **Tactics:**
  - Skeleton loaders (not spinners)
  - Optimistic UI updates
  - Instant visual feedback
  - Progressive loading (above-the-fold first)

---

## 🚀 Implementation Notes

### Tailwind Config Extensions

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#EA580C',
          dark: '#C2410C',
          light: '#FB923C',
        },
        slate: {
          DEFAULT: '#0F172A',
          light: '#334155',
        },
        grey: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }
    }
  }
}
```

### shadcn/ui Customization

Use shadcn/ui components as base, customize with:
- Primary color: Orange (#EA580C)
- Border radius: 8px (default)
- Focus ring: Orange

### Font Installation (web)

**Option A — Google Fonts** (see `frontend/public/index.html`): load **Inter** with weights **400, 500, 600, 700**.

**Option B — npm**

```bash
npm install @fontsource/inter
```

```javascript
// In main App.js or index.js
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
```

---

## ✅ Design Approval Checklist

Before development, confirm:

- [ ] Color palette feels professional and appropriate
- [ ] Typography is readable and hierarchical
- [ ] Search interface design meets usability goals
- [ ] Dashboard layouts show right information
- [ ] Component designs are consistent
- [ ] Mobile responsiveness is acceptable
- [ ] States (loading, empty, error) are handled
- [ ] Overall aesthetic inspires confidence

---

**Design System Version:** 1.1  
**Last Updated:** May 2026  
**Status:** Ready for Development

