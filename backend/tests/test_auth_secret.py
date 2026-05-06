import os

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

import pytest

import auth


def test_jwt_secret_is_required_by_default(monkeypatch):
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("ALLOW_INSECURE_DEV_JWT", raising=False)

    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY is not configured"):
        auth.create_access_token({"sub": "user-1"})


def test_dev_jwt_fallback_requires_explicit_opt_in(monkeypatch):
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("ALLOW_INSECURE_DEV_JWT", "true")

    token = auth.create_access_token({"sub": "user-1"})

    assert token


def test_dev_jwt_fallback_is_blocked_in_production(monkeypatch):
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ALLOW_INSECURE_DEV_JWT", "true")

    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY is not configured"):
        auth.create_access_token({"sub": "user-1"})
