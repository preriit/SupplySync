import os
import sys
from datetime import timedelta
from pathlib import Path

import pytest
from jose import jwt

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from auth import (  # noqa: E402
    INSECURE_DEV_JWT_SECRET,
    JWT_ALGORITHM,
    _get_jwt_secret_key,
    create_access_token,
)


def test_missing_jwt_secret_fails_closed_by_default(monkeypatch):
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.delenv("ALLOW_INSECURE_DEV_JWT", raising=False)
    monkeypatch.setenv("APP_ENV", "development")

    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY is not configured"):
        _get_jwt_secret_key()


def test_insecure_dev_secret_requires_explicit_non_production_opt_in(monkeypatch):
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("ALLOW_INSECURE_DEV_JWT", "true")

    token = create_access_token({"sub": "user-123"}, expires_delta=timedelta(minutes=5))
    payload = jwt.decode(token, INSECURE_DEV_JWT_SECRET, algorithms=[JWT_ALGORITHM])

    assert payload["sub"] == "user-123"


def test_production_never_uses_insecure_dev_secret(monkeypatch):
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ALLOW_INSECURE_DEV_JWT", "true")

    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY is not configured"):
        _get_jwt_secret_key()


def test_configured_jwt_secret_takes_precedence(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "configured-secret")
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("ALLOW_INSECURE_DEV_JWT", "true")

    assert _get_jwt_secret_key() == "configured-secret"
