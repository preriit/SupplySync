# SupplySync Vision

## 1) Problem Statement
Small and mid-sized distributors and retailers lose revenue due to stockouts, overstocking, delayed replenishment, and poor inventory visibility across channels.

SupplySync aims to provide a simple, reliable operating system for inventory planning and execution so teams can make faster and better stocking decisions.

## 2) Target Users
- **Primary:** Inventory managers, operations managers, and owners of small to mid-sized supply businesses.
- **Secondary:** Warehouse staff, purchase teams, and finance stakeholders.

## 3) Core Outcomes
- Reduce avoidable stockouts.
- Improve replenishment speed and confidence.
- Increase inventory accuracy and trust in the numbers.
- Improve working-capital efficiency (less dead stock).

## 4) North-Star Metric
- **Stockout rate reduction (%)** for pilot customers over rolling 30 days.

## 5) Supporting Metrics
- Inventory accuracy (%)
- Reorder cycle time (days/hours)
- Fill rate (%)
- Forecast error (MAPE or equivalent)
- Aged inventory value
- Daily boxes sold per dealer, segmented by size and key product attributes.

## 5.1) Dealer Network Intelligence Direction
- As more dealers onboard, track daily sold-box volume per dealer with size and attribute breakdowns.
- Use this to compute regional moving averages and benchmark ranges.
- Turn these benchmarks into practical dealer insights (for example: unusually high/low movement, stock mix gaps, and replenishment guidance).
- Use benchmarking as decision support, not automated decision replacement.

## 6) Product Principles
- Keep workflows practical and fast for non-technical operators.
- Prefer explainable suggestions over black-box recommendations.
- Optimize for reliability first, sophistication second.
- Build for gradual adoption: simple defaults, advanced controls later.
- Build image intelligence in phases: metadata first, user-facing AI next.

See `docs/IMAGE_INTELLIGENCE_FUTURE_PLAYBOOK.md` for future image search/matching/reporting direction.

## 7) Out of Scope (Current Stage)
- Fully automated autonomous purchasing without user approval.
- Advanced optimization requiring heavy data-science infrastructure.
- Complex ERP-style customization before core workflows are stable.

## 8) Validation Plan
- Pilot with a small set of customers/stores.
- Release features behind flags where possible.
- Measure impact per feature before broad rollout.

## 9) Revision Log
- 2026-04-30: Initial version created.
- 2026-05-05: Added dealer-level daily sales aggregation and regional benchmark insight direction.
- 2026-05-07: Added image intelligence future playbook reference.
