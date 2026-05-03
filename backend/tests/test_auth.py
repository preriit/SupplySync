import asyncio
import os
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from auth import create_access_token, get_current_user  # noqa: E402


class _FakeQuery:
    def __init__(self, user):
        self._user = user

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self._user


class _FakeDb:
    def __init__(self, user):
        self._user = user

    def query(self, model):
        return _FakeQuery(self._user)


def _credentials_for(user_id):
    return SimpleNamespace(credentials=create_access_token({"sub": user_id}))


def test_get_current_user_returns_active_user():
    user = SimpleNamespace(id="user-1", is_active=True, deleted_at=None)

    result = asyncio.run(get_current_user(_credentials_for(user.id), _FakeDb(user)))

    assert result is user


@pytest.mark.parametrize(
    "user",
    [
        SimpleNamespace(id="inactive-user", is_active=False, deleted_at=None),
        SimpleNamespace(id="deleted-user", is_active=True, deleted_at=object()),
    ],
)
def test_get_current_user_rejects_revoked_accounts(user):
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(get_current_user(_credentials_for(user.id), _FakeDb(user)))

    assert exc_info.value.status_code == 401
