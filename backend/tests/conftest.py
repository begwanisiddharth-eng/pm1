import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.database import get_db, init_db
from app.main import app


@pytest.fixture
def test_db(tmp_path: Path):
    db_path = tmp_path / "test.db"
    init_db(db_path)
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    yield conn
    conn.close()


@pytest.fixture
def client(test_db: sqlite3.Connection) -> TestClient:
    def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def auth_client(client: TestClient) -> TestClient:
    client.post("/api/auth/login", json={"username": "user", "password": "password"})
    return client
