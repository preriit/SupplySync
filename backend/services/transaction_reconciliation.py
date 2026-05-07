"""Utilities for normalizing product transaction ledgers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

# Default window for product transaction history in dealer UI and API responses.
PUBLIC_TRANSACTION_HISTORY_DAYS = 90


def utc_transaction_window_start(*, days: int | None = None) -> datetime:
    n = PUBLIC_TRANSACTION_HISTORY_DAYS if days is None else days
    return datetime.now(timezone.utc) - timedelta(days=n)


def txn_created_at_utc(txn: Any) -> datetime | None:
    created_at = getattr(txn, "created_at", None)
    if created_at is None:
        return None
    if created_at.tzinfo is None:
        return created_at.replace(tzinfo=timezone.utc)
    return created_at.astimezone(timezone.utc)


def txn_in_public_history_window(txn: Any, since: datetime) -> bool:
    ts = txn_created_at_utc(txn)
    if ts is None:
        return False
    return ts >= since


OPENING_BALANCE_NOTE = "MIGRATION_OPENING_BALANCE_AUTO"


@dataclass
class TransactionReview:
    txn_id: str
    original_type: str
    effective_type: str
    quantity: int
    original_before: int
    original_after: int
    normalized_before: int
    normalized_after: int
    delta_issue: str


@dataclass
class LedgerReview:
    opening_balance: int
    baseline_opening_balance: int
    reconciliation_gap: int
    net_movement: int
    projected_final: int
    has_ambiguous_rows: bool
    has_negative_after_normalize: bool
    rows: list[TransactionReview]


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _sort_key(txn: Any) -> tuple[datetime, str]:
    created_at = txn_created_at_utc(txn) or datetime.min.replace(tzinfo=timezone.utc)
    return created_at, str(getattr(txn, "id", ""))


def _effective_type(txn: Any) -> tuple[str, str]:
    """Returns (effective_type, issue_code)."""
    original_type = str(getattr(txn, "transaction_type", "") or "").strip().lower()
    quantity = abs(_safe_int(getattr(txn, "quantity", 0)))
    before = _safe_int(getattr(txn, "quantity_before", 0))
    after = _safe_int(getattr(txn, "quantity_after", 0))
    delta = after - before

    if original_type not in {"add", "subtract"}:
        return original_type or "unknown", "invalid_transaction_type"

    expected_delta = quantity if original_type == "add" else -quantity
    if delta == expected_delta:
        return original_type, ""

    flipped_type = "subtract" if original_type == "add" else "add"
    flipped_delta = quantity if flipped_type == "add" else -quantity
    if delta == flipped_delta:
        return flipped_type, "flipped_type_by_delta"

    return original_type, "ambiguous_delta_mismatch"


def analyze_product_transactions(
    transactions: list[Any],
    current_quantity: int,
) -> LedgerReview:
    ordered = sorted(transactions, key=_sort_key)
    reviews: list[TransactionReview] = []
    net_movement = 0
    has_ambiguous = False

    for txn in ordered:
        effective_type, issue = _effective_type(txn)
        qty = abs(_safe_int(getattr(txn, "quantity", 0)))
        movement = qty if effective_type == "add" else -qty
        net_movement += movement
        if issue.startswith("ambiguous") or issue.startswith("invalid"):
            has_ambiguous = True

        reviews.append(
            TransactionReview(
                txn_id=str(getattr(txn, "id", "")),
                original_type=str(getattr(txn, "transaction_type", "")),
                effective_type=effective_type,
                quantity=qty,
                original_before=_safe_int(getattr(txn, "quantity_before", 0)),
                original_after=_safe_int(getattr(txn, "quantity_after", 0)),
                normalized_before=0,
                normalized_after=0,
                delta_issue=issue,
            )
        )

    baseline_opening = _safe_int(current_quantity, 0) - net_movement
    prefix = 0
    min_prefix = 0
    for row in reviews:
        prefix += row.quantity if row.effective_type == "add" else -row.quantity
        min_prefix = min(min_prefix, prefix)

    # Clamp opening so normalized ledger does not go negative due legacy baseline shifts.
    required_opening = max(baseline_opening, -min_prefix)
    reconciliation_gap = required_opening - baseline_opening
    opening_balance = required_opening
    running = opening_balance
    has_negative = running < 0
    for row in reviews:
        row.normalized_before = running
        if row.effective_type == "add":
            running += row.quantity
        else:
            running -= row.quantity
        row.normalized_after = running
        if row.normalized_after < 0:
            has_negative = True

    return LedgerReview(
        opening_balance=opening_balance,
        baseline_opening_balance=baseline_opening,
        reconciliation_gap=reconciliation_gap,
        net_movement=net_movement,
        projected_final=running,
        has_ambiguous_rows=has_ambiguous,
        has_negative_after_normalize=has_negative,
        rows=reviews,
    )
