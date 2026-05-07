"""
Dealer-facing inventory report rows with adaptive, size-aware scoring.

Design goals:
- Avoid fixed global thresholds that break across dealer sizes/mixes.
- Compare products against peer baselines (subcategory proxy for size/type).
- Keep API shape backward-compatible for web/mobile clients.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from statistics import median
from typing import Any, List, Optional, Union
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Product, ProductTransaction, SubCategory


def normalize_report_list_type(raw: str) -> str:
    x = (raw or "").strip().lower()
    if x == "fast_movers":
        return "fast_moving"
    if x == "dead_stock":
        return "slow_moving"
    return x


def _brand_product_label(brand: Optional[str], product_name: Optional[str]) -> str:
    b = (brand or "").strip()
    n = (product_name or "").strip()
    if b and n:
        return f"{b} {n}"
    return b or n or "Product"


def _utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _days_active(created_at: Optional[datetime], now: datetime) -> int:
    c = _utc(created_at)
    if not c:
        return 1
    return max(1, (now - c).days)


def _sold_30_subq(db: Session, merchant_id: UUID, thirty_start: datetime):
    return (
        db.query(
            ProductTransaction.product_id.label("pid"),
            func.coalesce(func.sum(ProductTransaction.quantity), 0).label("sold_30"),
        )
        .filter(
            ProductTransaction.merchant_id == merchant_id,
            ProductTransaction.transaction_type == "subtract",
            ProductTransaction.created_at >= thirty_start,
        )
        .group_by(ProductTransaction.product_id)
        .subquery()
    )


def _sold_prev_30_subq(db: Session, merchant_id: UUID, sixty_start: datetime, thirty_start: datetime):
    return (
        db.query(
            ProductTransaction.product_id.label("pid"),
            func.coalesce(func.sum(ProductTransaction.quantity), 0).label("sold_prev_30"),
        )
        .filter(
            ProductTransaction.merchant_id == merchant_id,
            ProductTransaction.transaction_type == "subtract",
            ProductTransaction.created_at >= sixty_start,
            ProductTransaction.created_at < thirty_start,
        )
        .group_by(ProductTransaction.product_id)
        .subquery()
    )


def _total_sold_subq(db: Session, merchant_id: UUID):
    return (
        db.query(
            ProductTransaction.product_id.label("pid"),
            func.coalesce(func.sum(ProductTransaction.quantity), 0).label("total_sold"),
        )
        .filter(
            ProductTransaction.merchant_id == merchant_id,
            ProductTransaction.transaction_type == "subtract",
        )
        .group_by(ProductTransaction.product_id)
        .subquery()
    )


def _last_sale_subq(db: Session, merchant_id: UUID):
    return (
        db.query(
            ProductTransaction.product_id.label("pid"),
            func.max(ProductTransaction.created_at).label("last_sale_at"),
        )
        .filter(
            ProductTransaction.merchant_id == merchant_id,
            ProductTransaction.transaction_type == "subtract",
        )
        .group_by(ProductTransaction.product_id)
        .subquery()
    )


def _percentile(sorted_values: List[float], q: float) -> float:
    if not sorted_values:
        return 0.0
    if q <= 0:
        return sorted_values[0]
    if q >= 1:
        return sorted_values[-1]
    pos = (len(sorted_values) - 1) * q
    lo = int(pos)
    hi = min(lo + 1, len(sorted_values) - 1)
    frac = pos - lo
    return sorted_values[lo] * (1 - frac) + sorted_values[hi] * frac


def _safe_ratio(num: float, den: float, default: float = 0.0) -> float:
    if den is None or den <= 0:
        return default
    return num / den


def _base_metrics_row(
    p: Product,
    subcat: Optional[SubCategory],
    sold_30: int,
    sold_prev_30: int,
    total_sold: int,
    last_sale_at: Optional[datetime],
    now: datetime,
) -> dict[str, Any]:
    days_active = _days_active(p.created_at, now)
    avg_30d = sold_30 / 30.0
    lifetime_avg = (total_sold / float(days_active)) if days_active else 0.0
    last = _utc(last_sale_at)
    if last:
        days_since_last_sale = max(0, (now - last).days)
    else:
        days_since_last_sale = max(0, (now - _utc(p.created_at)).days) if p.created_at else 0

    slow_bucket = None
    if days_since_last_sale >= 90:
        slow_bucket = "90+"
    elif days_since_last_sale >= 60:
        slow_bucket = "60+"
    elif days_since_last_sale >= 30:
        slow_bucket = "30+"

    coverage_days: Optional[float]
    if avg_30d > 0:
        coverage_days = round(p.current_quantity / avg_30d, 1)
    else:
        coverage_days = None

    excess_stock = float(p.current_quantity or 0) - (avg_30d * 60.0)

    last_movement = "No movement"
    if last_sale_at:
        lu = _utc(last_sale_at)
        if lu:
            last_movement = lu.strftime("%d %b %Y")

    size_inches = ""
    size_mm = ""
    if subcat:
        if subcat.height_inches and subcat.width_inches:
            size_inches = f"{subcat.height_inches}x{subcat.width_inches} in"
        if subcat.height_mm and subcat.width_mm:
            size_mm = f"{subcat.height_mm}x{subcat.width_mm} mm"

    return {
        "product_id": str(p.id),
        "sub_category_id": str(p.sub_category_id) if p.sub_category_id else None,
        "brand": (p.brand or "").strip(),
        "product_name": (p.name or "").strip(),
        "name": _brand_product_label(p.brand, p.name),
        "current_stock_boxes": int(p.current_quantity or 0),
        "size_inches": size_inches,
        "size_mm": size_mm,
        "display_size": size_inches or size_mm,
        "total_sold_boxes": int(total_sold),
        "sold_last_30_days": int(sold_30),
        "sold_previous_30_days": int(sold_prev_30),
        "created_date": p.created_at.isoformat() if p.created_at else None,
        "last_sale_date": last_sale_at.isoformat() if last_sale_at else None,
        "days_active": int(days_active),
        "days_since_last_sale": int(days_since_last_sale),
        "avg_30d_sales_per_day": round(avg_30d, 4),
        "lifetime_avg_per_day": round(lifetime_avg, 4),
        "slow_bucket": slow_bucket,
        "stock_coverage_days": coverage_days,
        "excess_stock": round(excess_stock, 2),
        # Legacy keys for web DealerDashboard "View all" dialog
        "current_stock": int(p.current_quantity or 0),
        "in_stock": int(p.current_quantity or 0),
        "units_moved": int(sold_30),
        "last_movement": last_movement,
        "last_movement_at": last_sale_at.isoformat() if last_sale_at else None,
        "days_since_movement": int(days_since_last_sale),
    }


def _collect_all_metrics(db: Session, merchant_id: UUID, now: datetime) -> List[dict[str, Any]]:
    """Collect all active products + movement metrics for adaptive scoring."""
    thirty_start = now - timedelta(days=30)
    sixty_start = now - timedelta(days=60)
    s30 = _sold_30_subq(db, merchant_id, thirty_start)
    sp = _sold_prev_30_subq(db, merchant_id, sixty_start, thirty_start)
    tot = _total_sold_subq(db, merchant_id)
    ls = _last_sale_subq(db, merchant_id)

    rows = (
        db.query(
            Product,
            SubCategory,
            func.coalesce(s30.c.sold_30, 0),
            func.coalesce(sp.c.sold_prev_30, 0),
            func.coalesce(tot.c.total_sold, 0),
            ls.c.last_sale_at,
        )
        .outerjoin(SubCategory, SubCategory.id == Product.sub_category_id)
        .outerjoin(s30, s30.c.pid == Product.id)
        .outerjoin(sp, sp.c.pid == Product.id)
        .outerjoin(tot, tot.c.pid == Product.id)
        .outerjoin(ls, ls.c.pid == Product.id)
        .filter(
            Product.merchant_id == merchant_id,
            Product.is_active == True,
        )
        .all()
    )
    return [
        _base_metrics_row(p, subcat, int(sold_30), int(sold_prev), int(total_sold), last_sale_at, now)
        for p, subcat, sold_30, sold_prev, total_sold, last_sale_at in rows
    ]


def _peer_key(row: dict[str, Any]) -> str:
    # Subcategory is the best available size/type proxy in current schema.
    return str(row.get("sub_category_id") or "unknown")


def _compute_peer_baselines(rows: List[dict[str, Any]]) -> dict[str, dict[str, float]]:
    grouped: dict[str, List[dict[str, Any]]] = {}
    for r in rows:
        grouped.setdefault(_peer_key(r), []).append(r)

    baselines: dict[str, dict[str, float]] = {}
    for key, bucket in grouped.items():
        rates = sorted((r.get("avg_30d_sales_per_day") or 0.0) for r in bucket)
        lifetime_rates = sorted((r.get("lifetime_avg_per_day") or 0.0) for r in bucket)
        staleness = sorted(float(r.get("days_since_last_sale") or 0) for r in bucket)
        coverage = sorted(
            float(r["stock_coverage_days"])
            for r in bucket
            if r.get("stock_coverage_days") is not None
        )
        sold_30 = sorted(float(r.get("sold_last_30_days") or 0) for r in bucket)
        trend = sorted(
            _safe_ratio(float(r.get("sold_last_30_days") or 0), float(r.get("sold_previous_30_days") or 0), default=0.0)
            for r in bucket
        )

        baselines[key] = {
            "median_rate": median(rates) if rates else 0.0,
            "median_lifetime_rate": median(lifetime_rates) if lifetime_rates else 0.0,
            "median_staleness": median(staleness) if staleness else 0.0,
            "median_coverage": median(coverage) if coverage else 0.0,
            "median_sold_30": median(sold_30) if sold_30 else 0.0,
            "p75_rate": _percentile(rates, 0.75),
            "p75_staleness": _percentile(staleness, 0.75),
            "p75_coverage": _percentile(coverage, 0.75) if coverage else 0.0,
            "p80_trend": _percentile(trend, 0.80),
        }
    return baselines


def _attach_adaptive_scores(
    rows: List[dict[str, Any]], baselines: dict[str, dict[str, float]]
) -> List[dict[str, Any]]:
    out: List[dict[str, Any]] = []
    for r in rows:
        base = baselines.get(_peer_key(r), {})
        median_rate = max(float(base.get("median_rate", 0.0)), 0.01)
        median_lifetime = max(float(base.get("median_lifetime_rate", 0.0)), 0.01)
        median_stale = max(float(base.get("median_staleness", 0.0)), 1.0)
        median_cov = max(float(base.get("median_coverage", 0.0)), 1.0)

        rate = float(r.get("avg_30d_sales_per_day") or 0.0)
        stale_days = float(r.get("days_since_last_sale") or 0.0)
        coverage = float(r.get("stock_coverage_days") or 0.0) if r.get("stock_coverage_days") is not None else 0.0
        sold_30 = float(r.get("sold_last_30_days") or 0.0)
        sold_prev = float(r.get("sold_previous_30_days") or 0.0)
        trend_ratio = _safe_ratio(sold_30, sold_prev, default=0.0 if sold_30 == 0 else 3.0)
        velocity_ratio = _safe_ratio(rate, median_rate, default=0.0)
        staleness_ratio = _safe_ratio(stale_days, median_stale, default=0.0)
        coverage_ratio = _safe_ratio(coverage, median_cov, default=0.0)

        rr = dict(r)
        rr["peer_group"] = _peer_key(r)
        rr["peer_median_rate"] = round(median_rate, 4)
        rr["peer_median_lifetime_rate"] = round(median_lifetime, 4)
        rr["peer_median_staleness_days"] = round(median_stale, 2)
        rr["peer_median_coverage_days"] = round(median_cov, 2)
        rr["velocity_ratio_vs_peer"] = round(velocity_ratio, 4)
        rr["staleness_ratio_vs_peer"] = round(staleness_ratio, 4)
        rr["coverage_ratio_vs_peer"] = round(coverage_ratio, 4)
        rr["trend_ratio"] = round(trend_ratio, 4)
        # Forward-compatible benchmark fields; currently use peer proxy until true regional feed is available.
        rr["category_lifetime_avg_per_day"] = round(median_lifetime, 4)
        rr["regional_avg_per_day"] = round(median_rate, 4)
        rr["report_explain"] = (
            f"Peer {_peer_key(r)} median/day={median_rate:.2f}, "
            f"this/day={rate:.2f}, stale={stale_days:.0f}d"
        )
        out.append(rr)
    return out


def _global_cutoffs(scored_rows: List[dict[str, Any]]) -> dict[str, float]:
    vel = sorted(float(r.get("velocity_ratio_vs_peer") or 0.0) for r in scored_rows)
    stale = sorted(float(r.get("staleness_ratio_vs_peer") or 0.0) for r in scored_rows)
    cov = sorted(float(r.get("coverage_ratio_vs_peer") or 0.0) for r in scored_rows)
    trend = sorted(float(r.get("trend_ratio") or 0.0) for r in scored_rows)
    sold30 = sorted(float(r.get("sold_last_30_days") or 0.0) for r in scored_rows)
    return {
        "fast_velocity_cutoff": max(1.0, _percentile(vel, 0.75)),
        "slow_staleness_cutoff": max(1.25, _percentile(stale, 0.75)),
        "over_coverage_cutoff": max(1.25, _percentile(cov, 0.75)),
        "momentum_trend_cutoff": max(1.10, _percentile(trend, 0.80)),
        "sold30_floor": max(3.0, _percentile(sold30, 0.50)),
    }


def _build_adaptive_rows(db: Session, merchant_id: UUID, now: datetime) -> tuple[List[dict[str, Any]], dict[str, float]]:
    raw = _collect_all_metrics(db, merchant_id, now)
    baselines = _compute_peer_baselines(raw)
    scored = _attach_adaptive_scores(raw, baselines)
    return scored, _global_cutoffs(scored)


def query_fast_moving(db: Session, merchant_id: UUID, now: datetime, limit: int) -> List[dict[str, Any]]:
    rows, cutoffs = _build_adaptive_rows(db, merchant_id, now)
    kept = [
        r
        for r in rows
        if float(r.get("sold_last_30_days") or 0) >= cutoffs["sold30_floor"]
        and float(r.get("velocity_ratio_vs_peer") or 0) >= cutoffs["fast_velocity_cutoff"]
    ]
    kept.sort(
        key=lambda r: (
            float(r.get("sold_last_30_days") or 0),
            float(r.get("velocity_ratio_vs_peer") or 0),
        ),
        reverse=True,
    )
    return kept[:limit]


def query_slow_moving(db: Session, merchant_id: UUID, now: datetime, limit: int) -> List[dict[str, Any]]:
    rows, cutoffs = _build_adaptive_rows(db, merchant_id, now)
    kept = [
        r
        for r in rows
        if float(r.get("sold_last_30_days") or 0) == 0
        or float(r.get("staleness_ratio_vs_peer") or 0) >= cutoffs["slow_staleness_cutoff"]
    ]
    kept.sort(
        key=lambda r: (
            float(r.get("days_since_last_sale") or 0),
            float(r.get("staleness_ratio_vs_peer") or 0),
        ),
        reverse=True,
    )
    return kept[:limit]


def query_overstocked(db: Session, merchant_id: UUID, now: datetime, limit: int) -> List[dict[str, Any]]:
    rows, cutoffs = _build_adaptive_rows(db, merchant_id, now)
    kept = [
        r
        for r in rows
        if float(r.get("current_stock_boxes") or 0) > 0
        and (
            float(r.get("coverage_ratio_vs_peer") or 0) >= cutoffs["over_coverage_cutoff"]
            or (
                float(r.get("sold_last_30_days") or 0) == 0
                and float(r.get("current_stock_boxes") or 0)
                >= max(1.0, float(r.get("peer_median_coverage_days") or 1.0) * 0.5)
            )
        )
    ]
    kept.sort(
        key=lambda r: (
            float(r.get("coverage_ratio_vs_peer") or 0),
            float(r.get("excess_stock") or 0),
        ),
        reverse=True,
    )
    return kept[:limit]


def query_high_momentum(db: Session, merchant_id: UUID, now: datetime, limit: int) -> List[dict[str, Any]]:
    rows, cutoffs = _build_adaptive_rows(db, merchant_id, now)
    kept = [
        r
        for r in rows
        if float(r.get("sold_last_30_days") or 0) >= cutoffs["sold30_floor"]
        and float(r.get("trend_ratio") or 0) >= cutoffs["momentum_trend_cutoff"]
        and float(r.get("velocity_ratio_vs_peer") or 0) >= 1.0
    ]
    kept.sort(
        key=lambda r: (
            float(r.get("lifetime_avg_per_day") or 0),
            float(r.get("trend_ratio") or 0),
        ),
        reverse=True,
    )
    return kept[:limit]


def run_dealer_product_report(
    db: Session,
    merchant_id: Union[UUID, str],
    list_type: str,
    limit: int,
    now: Optional[datetime] = None,
) -> tuple[str, List[dict[str, Any]]]:
    now = now or datetime.now(timezone.utc)
    mid: UUID = merchant_id if isinstance(merchant_id, UUID) else UUID(str(merchant_id))
    lt = normalize_report_list_type(list_type)
    if lt == "fast_moving":
        return lt, query_fast_moving(db, mid, now, limit)
    if lt == "slow_moving":
        return lt, query_slow_moving(db, mid, now, limit)
    if lt == "overstocked":
        return lt, query_overstocked(db, mid, now, limit)
    if lt == "high_momentum":
        return lt, query_high_momentum(db, mid, now, limit)
    raise ValueError(
        "list_type must be one of: fast_moving, slow_moving, overstocked, high_momentum "
        "(aliases: fast_movers, dead_stock)"
    )
