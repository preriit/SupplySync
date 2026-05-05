"""Regression checks for stock transaction write safety."""

from pathlib import Path


def _create_product_transaction_source() -> str:
    source = Path(__file__).resolve().parents[1] / "server.py"
    text = source.read_text()
    start = text.index("async def create_product_transaction(")
    end = text.index("@api_router.get(\"/dealer/products/{product_id}/transactions\")", start)
    return text[start:end]


def test_stock_transaction_locks_active_product_row():
    endpoint_source = _create_product_transaction_source()

    assert ".with_for_update().first()" in endpoint_source
    assert "Product.is_active == True" in endpoint_source
