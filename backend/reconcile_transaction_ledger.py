"""Reconcile transaction ledgers for accurate historical reporting.

Usage:
  python reconcile_transaction_ledger.py --dry-run
  python reconcile_transaction_ledger.py --apply
"""

from __future__ import annotations

import argparse
import csv
import uuid
from datetime import timedelta
from pathlib import Path

from database import SessionLocal
from models import Product, ProductTransaction
from services.transaction_reconciliation import (
    OPENING_BALANCE_NOTE,
    analyze_product_transactions,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Apply safe fixes")
    parser.add_argument("--dry-run", action="store_true", help="Report only")
    args = parser.parse_args()
    apply_mode = args.apply and not args.dry_run

    reports_dir = Path("reports")
    reports_dir.mkdir(exist_ok=True)
    summary_csv = reports_dir / "transaction_reconciliation_summary.csv"
    rows_csv = reports_dir / "transaction_reconciliation_rows.csv"
    issues_csv = reports_dir / "transaction_reconciliation_issues.csv"

    db = SessionLocal()
    try:
        products = db.query(Product).filter(Product.is_active.is_(True)).all()
        summary_rows: list[dict] = []
        detail_rows: list[dict] = []
        issue_rows: list[dict] = []

        applied_products = 0
        skipped_products = 0

        for product in products:
            txns = (
                db.query(ProductTransaction)
                .filter(ProductTransaction.product_id == product.id)
                .order_by(ProductTransaction.created_at.asc(), ProductTransaction.id.asc())
                .all()
            )
            if not txns:
                continue

            review = analyze_product_transactions(txns, product.current_quantity or 0)
            status = "clean"
            reasons: list[str] = []

            if review.has_ambiguous_rows:
                status = "needs-fix"
                reasons.append("ambiguous_delta_rows")
            if review.baseline_opening_balance < 0:
                status = "needs-fix"
                reasons.append("negative_computed_opening_balance")
            if review.has_negative_after_normalize:
                status = "needs-fix"
                reasons.append("negative_running_balance_after_normalize")
            if review.reconciliation_gap != 0:
                status = "needs-fix"
                reasons.append("reconciliation_gap_required")
            if review.projected_final != int(product.current_quantity or 0):
                status = "needs-fix"
                reasons.append("projected_final_mismatch")

            has_flips = any(r.delta_issue == "flipped_type_by_delta" for r in review.rows)
            if status == "clean" and has_flips:
                status = "fixed" if apply_mode else "fixable"

            opening_event_needed = review.opening_balance > 0
            if opening_event_needed and status == "clean":
                status = "fixed" if apply_mode else "fixable"

            summary_rows.append(
                {
                    "product_id": str(product.id),
                    "product_name": f"{product.brand} {product.name}",
                    "status": status,
                    "txn_count": len(txns),
                    "opening_balance": review.opening_balance,
                    "baseline_opening_balance": review.baseline_opening_balance,
                    "reconciliation_gap": review.reconciliation_gap,
                    "net_movement": review.net_movement,
                    "current_quantity": int(product.current_quantity or 0),
                    "projected_final": review.projected_final,
                    "reasons": "|".join(reasons),
                }
            )

            for idx, row in enumerate(review.rows, start=1):
                detail_rows.append(
                    {
                        "product_id": str(product.id),
                        "sequence": idx,
                        "txn_id": row.txn_id,
                        "original_type": row.original_type,
                        "effective_type": row.effective_type,
                        "quantity": row.quantity,
                        "original_before": row.original_before,
                        "original_after": row.original_after,
                        "normalized_before": row.normalized_before,
                        "normalized_after": row.normalized_after,
                        "delta_issue": row.delta_issue,
                    "reconciliation_gap": review.reconciliation_gap,
                    }
                )
                if row.delta_issue:
                    issue_rows.append(
                        {
                            "product_id": str(product.id),
                            "txn_id": row.txn_id,
                            "issue": row.delta_issue,
                            "original_type": row.original_type,
                            "effective_type": row.effective_type,
                            "original_before": row.original_before,
                            "original_after": row.original_after,
                            "quantity": row.quantity,
                        }
                    )

            if not apply_mode:
                continue

            if status == "needs-fix":
                skipped_products += 1
                continue

            # Apply deterministic fixes only.
            row_by_id = {r.txn_id: r for r in review.rows}
            for txn in txns:
                row = row_by_id[str(txn.id)]
                txn.transaction_type = row.effective_type
                txn.quantity = abs(row.quantity)
                txn.quantity_before = row.normalized_before
                txn.quantity_after = row.normalized_after
                if row.delta_issue == "flipped_type_by_delta":
                    note = (txn.notes or "").strip()
                    marker = " [auto-fixed: transaction_type flipped by delta]"
                    txn.notes = (note + marker).strip()

            if opening_event_needed:
                first_txn = txns[0]
                marker_exists = any(
                    (t.notes or "").find(OPENING_BALANCE_NOTE) >= 0 for t in txns
                )
                if not marker_exists:
                    opening_at = first_txn.created_at - timedelta(seconds=1)
                    db.add(
                        ProductTransaction(
                            id=uuid.uuid4(),
                            product_id=product.id,
                            merchant_id=product.merchant_id,
                            user_id=first_txn.user_id,
                            transaction_type="add",
                            quantity=review.opening_balance,
                            quantity_before=0,
                            quantity_after=review.opening_balance,
                            notes=f"{OPENING_BALANCE_NOTE}: synthesized opening balance for normalized ledger",
                            created_at=opening_at,
                        )
                    )

            applied_products += 1

        if apply_mode:
            db.commit()

        with summary_csv.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "product_id",
                    "product_name",
                    "status",
                    "txn_count",
                    "opening_balance",
                    "baseline_opening_balance",
                    "reconciliation_gap",
                    "net_movement",
                    "current_quantity",
                    "projected_final",
                    "reasons",
                ],
            )
            writer.writeheader()
            writer.writerows(summary_rows)

        with rows_csv.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "product_id",
                    "sequence",
                    "txn_id",
                    "original_type",
                    "effective_type",
                    "quantity",
                    "original_before",
                    "original_after",
                    "normalized_before",
                    "normalized_after",
                    "delta_issue",
                    "reconciliation_gap",
                ],
            )
            writer.writeheader()
            writer.writerows(detail_rows)

        with issues_csv.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "product_id",
                    "txn_id",
                    "issue",
                    "original_type",
                    "effective_type",
                    "original_before",
                    "original_after",
                    "quantity",
                ],
            )
            writer.writeheader()
            writer.writerows(issue_rows)

        print(f"mode={'apply' if apply_mode else 'dry-run'}")
        print(f"summary_csv={summary_csv.resolve()}")
        print(f"rows_csv={rows_csv.resolve()}")
        print(f"issues_csv={issues_csv.resolve()}")
        print(f"applied_products={applied_products}")
        print(f"skipped_products={skipped_products}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
