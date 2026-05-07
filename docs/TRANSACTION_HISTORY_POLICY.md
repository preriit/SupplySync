# Product transaction history policy

## Current (Phase 1)

- Dealer API `GET /dealer/products/{product_id}/transactions` returns **all transactions in the last 90 calendar days** for that product. There is **no row-count cap** inside that window.
- Response includes `history_window_days` (90) and `has_older_transactions` when any rows exist **before** that window (for future UX).
- When `normalized=true`, the server still loads the **full** ledger for reconciliation math, but the returned `transactions` array is **only the last 90 days**.

## Phase 2 (planned)

- Older-than-window history: user requests via in-app control; **agent generates and shares a PDF** (not implemented yet).
