"""Append-only product activity log rows."""

from sqlalchemy.orm import Session

from models import ProductActivityLog


def log_product_activity(
    db: Session,
    product_id: str,
    merchant_id: str,
    user_id: str,
    activity_type: str,
    changes: dict = None,
    description: str = None,
):
    """Log product activity for audit trail. Caller should commit after main operation."""
    activity = ProductActivityLog(
        product_id=product_id,
        merchant_id=merchant_id,
        user_id=user_id,
        activity_type=activity_type,
        changes=changes,
        description=description,
    )
    db.add(activity)
