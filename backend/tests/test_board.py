import json
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.database import init_db


# --- Database initialisation tests ---

def test_init_creates_tables(tmp_path: Path) -> None:
    init_db(tmp_path / "test.db")
    conn = sqlite3.connect(tmp_path / "test.db")
    tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    conn.close()
    assert "users" in tables
    assert "boards" in tables


def test_init_seeds_user(tmp_path: Path) -> None:
    init_db(tmp_path / "test.db")
    conn = sqlite3.connect(tmp_path / "test.db")
    row = conn.execute("SELECT username FROM users WHERE username = 'user'").fetchone()
    conn.close()
    assert row is not None


def test_init_seeds_board(tmp_path: Path) -> None:
    init_db(tmp_path / "test.db")
    conn = sqlite3.connect(tmp_path / "test.db")
    row = conn.execute(
        "SELECT b.content FROM boards b JOIN users u ON b.user_id = u.id WHERE u.username = 'user'"
    ).fetchone()
    conn.close()
    assert row is not None
    board = json.loads(row[0])
    assert len(board["columns"]) == 5
    assert len(board["cards"]) == 8


def test_init_is_idempotent(tmp_path: Path) -> None:
    db_path = tmp_path / "test.db"
    init_db(db_path)
    init_db(db_path)
    conn = sqlite3.connect(db_path)
    count = conn.execute("SELECT COUNT(*) FROM users WHERE username = 'user'").fetchone()[0]
    conn.close()
    assert count == 1


# --- Board API tests ---


def test_get_board_unauthenticated(client: TestClient) -> None:
    response = client.get("/api/board")
    assert response.status_code == 401


def test_get_board_returns_default_board(auth_client: TestClient) -> None:
    response = auth_client.get("/api/board")
    assert response.status_code == 200
    board = response.json()
    assert len(board["columns"]) == 5
    assert len(board["cards"]) == 8


def test_put_board_unauthenticated(client: TestClient) -> None:
    response = client.put("/api/board", json={"columns": [], "cards": {}})
    assert response.status_code == 401


def test_put_board_updates_and_returns(auth_client: TestClient) -> None:
    new_board = {
        "columns": [{"id": "col-1", "title": "Only Column", "cardIds": []}],
        "cards": {},
    }
    response = auth_client.put("/api/board", json=new_board)
    assert response.status_code == 200
    assert response.json()["columns"][0]["title"] == "Only Column"


def test_put_board_persists(auth_client: TestClient) -> None:
    new_board = {
        "columns": [{"id": "col-1", "title": "Persisted", "cardIds": []}],
        "cards": {},
    }
    auth_client.put("/api/board", json=new_board)
    response = auth_client.get("/api/board")
    assert response.json()["columns"][0]["title"] == "Persisted"


def test_put_board_invalid_structure(auth_client: TestClient) -> None:
    response = auth_client.put("/api/board", json={"invalid": "structure"})
    assert response.status_code == 422


def test_put_board_invalid_does_not_overwrite(auth_client: TestClient) -> None:
    original = auth_client.get("/api/board").json()
    auth_client.put("/api/board", json={"invalid": "structure"})
    after = auth_client.get("/api/board").json()
    assert after == original
