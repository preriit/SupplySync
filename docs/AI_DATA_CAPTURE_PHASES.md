# AI Data Capture (Phases)

## Goal

Start capturing high-value, low-overhead metadata now so SupplySync can deliver trustworthy AI insights and ML forecasting later **without** reworking years of historical data.

## Guiding principles

- Keep write paths simple and fast.
- Prefer append-only/event capture over destructive rewrites.
- Preserve historical meaning even when master data changes (use snapshots).
- Make unknowns explicit via enums (`unknown`, `other`) rather than null chaos.
- Separate *true demand* from *inventory corrections*.

---

## Phase 1 — ML-ready logging foundation (capture first)

### Outcomes

- Every stock movement is semantically labeled (at least `unknown`).
- Events carry source + entry-mode metadata.
- Event-time context is frozen via snapshot IDs.
- A daily fact table exists for reporting/benchmarking/ML features.

### 1) Transaction schema additions (Phase 1)

Target table: `product_transactions`

Add fields:

- **Semantics**
  - `reason_code` (string, required with default)
- **Source**
  - `source_channel` (string, required with default)
  - `entry_mode` (string, required with default)
- **Time quality**
  - `event_occurred_at` (timestamp with timezone, nullable)
  - `is_backfilled` (boolean, default `false`)
- **Reconciliation / integrity**
  - `is_reconciled` (boolean, default `false`)
  - `reconciliation_rule` (string, nullable)
  - `data_quality_flag` (string, default `ok`)
- **Dealer/location snapshot (optional but recommended)**
  - `dealer_city` (string, nullable)
  - `dealer_state` (string, nullable)
  - `dealer_country` (string, nullable)
- **Product context snapshots (recommended)**
  - `subcategory_id_snapshot` (uuid, nullable)
  - `size_id_snapshot` (uuid, nullable)
  - `make_type_id_snapshot` (uuid, nullable)
  - `surface_type_id_snapshot` (uuid, nullable)
  - `body_type_id_snapshot` (uuid, nullable)
  - `quality_id_snapshot` (uuid, nullable)

Notes:
- `event_occurred_at` is the real-world event time if known; fallback is `created_at`.
- Snapshot fields protect AI/ML from “master data drift”.

### 2) Required enums (Phase 1)

#### `reason_code`

- `sale`
- `restock`
- `return_in`
- `return_out`
- `damage`
- `adjustment`
- `transfer_in`
- `transfer_out`
- `opening_balance`
- `migration_fix`
- `other`
- `unknown`

#### `source_channel`

- `web`
- `mobile`
- `admin`
- `api`
- `script`
- `system`
- `unknown`

#### `entry_mode`

- `manual`
- `bulk_upload`
- `import`
- `system_generated`
- `reconciliation`
- `unknown`

#### `data_quality_flag`

- `ok`
- `inferred`
- `backfilled`
- `reconciled`
- `anomalous`
- `incomplete`

### 3) Write-time mapping rules (Phase 1 defaults)

- Existing add/subtract transaction API:
  - `source_channel`: infer from client (`web`/`mobile`) else `api`
  - `entry_mode`: `manual`
  - `reason_code`: default `unknown` (until UI adds a selector)
  - `event_occurred_at`: null
  - `is_backfilled`: `false`
  - `is_reconciled`: `false`
  - `data_quality_flag`: `ok`

- Reconciliation script-generated records:
  - `source_channel`: `script`
  - `entry_mode`: `reconciliation`
  - `reason_code`: `migration_fix` or `opening_balance`
  - `is_reconciled`: `true`
  - `reconciliation_rule`: set to applied rule key
  - `data_quality_flag`: `reconciled`

### 4) Daily aggregate table (Phase 1)

Create table: `dealer_product_daily_facts`

Purpose:
- fast regional benchmarking
- feature-ready dataset for forecasting and insights

Columns (recommended):

- `date` (date, not null)
- `merchant_id` (uuid, not null)
- `dealer_city` (string, nullable)
- `dealer_state` (string, nullable)
- `dealer_country` (string, nullable)
- `product_id` (uuid, not null)
- `subcategory_id` (uuid, nullable)
- `size_id` (uuid, nullable)
- `make_type_id` (uuid, nullable)
- `surface_type_id` (uuid, nullable)
- `body_type_id` (uuid, nullable)
- `quality_id` (uuid, nullable)
- `sold_boxes` (int, default 0)
- `restocked_boxes` (int, default 0)
- `returned_in_boxes` (int, default 0)
- `returned_out_boxes` (int, default 0)
- `adjustment_boxes_net` (int, default 0)
- `closing_stock_boxes` (int, nullable)
- `transactions_count` (int, default 0)
- `reconciled_txn_count` (int, default 0)
- `incomplete_txn_count` (int, default 0)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Unique key:
- `(date, merchant_id, product_id)`

### 5) Phase 1 benchmark outputs (internal)

From `dealer_product_daily_facts`, compute:
- regional average sold boxes per product group
- moving averages (7-day, 30-day)
- percentile bands (p25, p50, p75) per region and product attributes

Minimum dimensions:
- region (`state` at minimum)
- size
- subcategory
- make type

### 6) Phase 1 migration plan (safe rollout)

- **A: Schema migration**: add columns with safe defaults.
- **B: Backfill**: set explicit defaults (`unknown`, `inferred`) + best-effort snapshots.
- **C: Write-path updates**: populate fields for all new transactions.
- **D: Daily facts job**: backfill last 12 months (or available) + run daily.
- **E: Validation**: reconcile daily totals vs raw transaction totals for pilot merchants.

### 7) Phase 1 acceptance checks

- No null `reason_code`, `source_channel`, `entry_mode`, `data_quality_flag` on new rows.
- `% reason_code=unknown` tracked weekly and trending down.
- Daily facts reconcile with transaction source.

---

## Phase 2 — Demand clarity + richer context (make insights accurate)

### Outcomes

- Separate demand vs corrections reliably.
- Capture enough context to explain trends and give “why” insights.

### Additions

- **Reason selection in UI** (required on stock updates in web/mobile):
  - at minimum: `sale`, `restock`, `adjustment`, `damage`, `return_in`, `return_out`
- **Stockout exposure** (recommended):
  - per product/day: hours out of stock, first-out timestamp, recovered timestamp
- **Optional commercial context** (if relevant):
  - price band, promotion flag, channel mix (walk-in/wholesale/etc.)
- **Phase 2 export request flow** (if you want “older history on demand”):
  - user requests extended transaction export range (async job)
  - generate PDF/CSV and notify user

---

## Phase 3 — Forecasting and prescriptive suggestions (ML productization)

### Outcomes

- Forecast demand by region + size + attributes.
- Recommend reorder quantities with confidence and explanation.

### Additions

- Model-ready feature store inputs (materialized views or tables):
  - rolling sales windows (7/30/90)
  - seasonality flags
  - stockout-adjusted demand estimates
- Prediction storage:
  - forecast table keyed by (date, merchant, product/segment, horizon)
- Recommendation tracking:
  - suggested reorder, accepted/rejected, reason, realized outcome

---

## Ownership

- Backend: schema + write-path + aggregation jobs
- Product/Ops: reason-code taxonomy and user workflows
- Analytics: benchmark definitions and validation

