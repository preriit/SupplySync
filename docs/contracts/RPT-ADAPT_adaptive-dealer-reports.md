# RPT-ADAPT: Adaptive Dealer Reports Contract

## Purpose

Define the behavior contract for dealer inventory reports so results are:

- adaptive to each dealer's own volume,
- size-aware via peer grouping,
- explainable in UI,
- backward-compatible with existing web/mobile consumers.

This contract replaces hardcoded global thresholds as the primary classification mechanism.

## Scope

Current report list types on `GET /dealer/dashboard/products-list`:

- `fast_moving` (alias: `fast_movers`)
- `slow_moving` (alias: `dead_stock`)
- `overstocked`
- `high_momentum`

Implementation source of truth:

- `backend/services/dealer_product_reports.py`

## Inputs and Derived Fields

Per active product (`products.is_active = true`) for a merchant:

- `current_stock_boxes` = `products.current_quantity`
- `sold_last_30_days` = sum of `product_transactions.quantity` where:
  - `transaction_type = 'subtract'`
  - `created_at >= now - 30 days`
- `sold_previous_30_days` = sum of subtract quantity for `now-60` to `now-30` day window
- `total_sold_boxes` = lifetime sum of subtract quantity
- `last_sale_date` = max subtract transaction timestamp
- `created_date` = product created timestamp
- `days_active` = `max(1, now - created_date in days)`
- `days_since_last_sale` = days from `last_sale_date` (or from `created_date` if no sale)
- `avg_30d_sales_per_day` = `sold_last_30_days / 30`
- `lifetime_avg_per_day` = `total_sold_boxes / days_active`
- `stock_coverage_days` = `current_stock_boxes / avg_30d_sales_per_day` (null if `avg_30d_sales_per_day <= 0`)
- `excess_stock` = `current_stock_boxes - (avg_30d_sales_per_day * 60)`

Slow bucket label:

- `90+` if `days_since_last_sale >= 90`
- `60+` if `>= 60`
- `30+` if `>= 30`

## Peer Grouping (Size-Aware Baseline)

Peer key (current):

- `peer_group = sub_category_id`

Rationale: subcategory is the available proxy for tile size/type behavior without introducing a new dimension table.

Future extension (planned):

- peer key can expand to `subcategory + surface + region + age_band` with versioned behavior.

## Baseline Computation

For each `peer_group`, compute from all active products:

- `median_rate` from `avg_30d_sales_per_day`
- `median_lifetime_rate` from `lifetime_avg_per_day`
- `median_staleness` from `days_since_last_sale`
- `median_coverage` from non-null `stock_coverage_days`
- percentile values:
  - `p75_rate`
  - `p75_staleness`
  - `p75_coverage` (coverage rows only)
  - `p80_trend`, where `trend_ratio = sold_last_30_days / sold_previous_30_days`

Per product normalized scores:

- `velocity_ratio_vs_peer = avg_30d_sales_per_day / max(median_rate, 0.01)`
- `staleness_ratio_vs_peer = days_since_last_sale / max(median_staleness, 1.0)`
- `coverage_ratio_vs_peer = stock_coverage_days / max(median_coverage, 1.0)` (0 when coverage unavailable)
- `trend_ratio = sold_last_30_days / sold_previous_30_days` with safe defaults

## Adaptive Global Cutoffs

From scored product set (for the merchant):

- `fast_velocity_cutoff = max(1.0, percentile75(velocity_ratio_vs_peer))`
- `slow_staleness_cutoff = max(1.25, percentile75(staleness_ratio_vs_peer))`
- `over_coverage_cutoff = max(1.25, percentile75(coverage_ratio_vs_peer))`
- `momentum_trend_cutoff = max(1.10, percentile80(trend_ratio))`
- `sold30_floor = max(3.0, percentile50(sold_last_30_days))`

These floors prevent unstable behavior on low-volume datasets.

## Classification Rules

### Fast Moving

Include product when both are true:

- `sold_last_30_days >= sold30_floor`
- `velocity_ratio_vs_peer >= fast_velocity_cutoff`

Sort:

1. `sold_last_30_days` desc
2. `velocity_ratio_vs_peer` desc

### Slow Moving

Include product when either is true:

- `sold_last_30_days == 0`
- `staleness_ratio_vs_peer >= slow_staleness_cutoff`

Sort:

1. `days_since_last_sale` desc
2. `staleness_ratio_vs_peer` desc

### Overstocked

Include product when stock exists and either is true:

- `coverage_ratio_vs_peer >= over_coverage_cutoff`
- fallback: `sold_last_30_days == 0` and stock above peer-informed threshold

Sort:

1. `coverage_ratio_vs_peer` desc
2. `excess_stock` desc

### High Momentum

Include product when all are true:

- `sold_last_30_days >= sold30_floor`
- `trend_ratio >= momentum_trend_cutoff`
- `velocity_ratio_vs_peer >= 1.0`

Sort:

1. `trend_ratio` desc
2. `lifetime_avg_per_day` desc

## API Output Contract

Response shape (unchanged top-level):

- `list_type`
- `limit`
- `total_count`
- `items[]`

Items include adaptive fields and legacy compatibility fields.

Adaptive and benchmark-ready fields:

- `peer_group`
- `peer_median_rate`
- `peer_median_lifetime_rate`
- `peer_median_staleness_days`
- `peer_median_coverage_days`
- `velocity_ratio_vs_peer`
- `staleness_ratio_vs_peer`
- `coverage_ratio_vs_peer`
- `trend_ratio`
- `category_lifetime_avg_per_day` (currently peer baseline proxy)
- `regional_avg_per_day` (currently peer baseline proxy)
- `report_explain`

Legacy compatibility fields retained:

- `units_moved`
- `current_stock`
- `in_stock`
- `last_movement`
- `last_movement_at`
- `days_since_movement`

## Backward Compatibility

Accepted list type aliases:

- `fast_movers` -> `fast_moving`
- `dead_stock` -> `slow_moving`

This preserves existing web/mobile routes and dialog calls.

## Non-Goals (Current Version)

- True cross-merchant regional benchmark feed
- Cost/value-based overstock capital scoring
- Seasonality/holiday weighting
- Category graph/time-series UI overlays

## Planned Evolution

1. Add regional benchmark source (real `regional_avg_per_day`).
2. Add age-band normalization (`0-30`, `31-90`, `90+` days active).
3. Move from rule labels to composite decision score with confidence bands.
4. Add value impact when cost basis is available.

## Verification Checklist

- API returns all 4 list types without 400 errors.
- Alias paths still work (`fast_movers`, `dead_stock`).
- For a mixed-size merchant, lists differ by subcategory dynamics (not one global threshold).
- UI still renders with old keys (`units_moved`, `current_stock`) where expected.

## Revision Log

- 2026-05-05: Initial adaptive, size-aware contract documented and aligned with backend implementation.
