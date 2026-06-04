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
    row = conn.execute("SELECT username, password_hash FROM users WHERE username = 'user'").fetchone()
    conn.close()
    assert row is not None
    assert row[1] != "", "password_hash should not be empty"


def test_init_seeds_board(tmp_path: Path) -> None:
    init_db(tmp_path / "test.db")
    conn = sqlite3.connect(tmp_path / "test.db")
    row = conn.execute(
        "SELECT b.content, b.name FROM boards b JOIN users u ON b.user_id = u.id WHERE u.username = 'user'"
    ).fetchone()
    conn.close()
    assert row is not None
    board = json.loads(row[0])
    assert len(board["columns"]) == 5
    assert len(board["cards"]) == 8
    assert row[1] == "Main Board"


def test_init_is_idempotent(tmp_path: Path) -> None:
    db_path = tmp_path / "test.db"
    init_db(db_path)
    init_db(db_path)
    conn = sqlite3.connect(db_path)
    count = conn.execute("SELECT COUNT(*) FROM users WHERE username = 'user'").fetchone()[0]
    conn.close()
    assert count == 1


# --- Board list tests ---

def test_list_boards_unauthenticated(client: TestClient) -> None:
    response = client.get("/api/boards")
    assert response.status_code == 401


def test_list_boards_returns_seeded_board(auth_client: TestClient) -> None:
    response = auth_client.get("/api/boards")
    assert response.status_code == 200
    boards = response.json()
    assert len(boards) == 1
    assert boards[0]["name"] == "Main Board"
    assert "id" in boards[0]
    assert "updated_at" in boards[0]


# --- Board get tests ---

def test_get_board_unauthenticated(client: TestClient) -> None:
    response = client.get("/api/boards/1")
    assert response.status_code == 401


def test_get_board_returns_default_board(auth_client: TestClient, default_board_id: int) -> None:
    response = auth_client.get(f"/api/boards/{default_board_id}")
    assert response.status_code == 200
    board = response.json()
    assert len(board["columns"]) == 5
    assert len(board["cards"]) == 8


def test_get_board_not_found(auth_client: TestClient) -> None:
    response = auth_client.get("/api/boards/99999")
    assert response.status_code == 404


# --- Board update tests ---

def test_put_board_unauthenticated(client: TestClient) -> None:
    response = client.put(
        "/api/boards/1",
        json={"columns": [], "cards": {}},
    )
    assert response.status_code == 401


def test_put_board_updates_and_returns(auth_client: TestClient, default_board_id: int) -> None:
    new_board = {
        "columns": [{"id": "col-1", "title": "Only Column", "cardIds": []}],
        "cards": {},
    }
    response = auth_client.put(f"/api/boards/{default_board_id}", json=new_board)
    assert response.status_code == 200
    assert response.json()["columns"][0]["title"] == "Only Column"


def test_put_board_persists(auth_client: TestClient, default_board_id: int) -> None:
    new_board = {
        "columns": [{"id": "col-1", "title": "Persisted", "cardIds": []}],
        "cards": {},
    }
    auth_client.put(f"/api/boards/{default_board_id}", json=new_board)
    response = auth_client.get(f"/api/boards/{default_board_id}")
    assert response.json()["columns"][0]["title"] == "Persisted"


def test_put_board_invalid_structure(auth_client: TestClient, default_board_id: int) -> None:
    response = auth_client.put(
        f"/api/boards/{default_board_id}", json={"invalid": "structure"}
    )
    assert response.status_code == 422


def test_put_board_invalid_does_not_overwrite(auth_client: TestClient, default_board_id: int) -> None:
    original = auth_client.get(f"/api/boards/{default_board_id}").json()
    auth_client.put(f"/api/boards/{default_board_id}", json={"invalid": "structure"})
    after = auth_client.get(f"/api/boards/{default_board_id}").json()
    assert after == original


# --- Board create tests ---

def test_create_board(auth_client: TestClient) -> None:
    response = auth_client.post("/api/boards", json={"name": "Sprint Board"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Sprint Board"
    assert "id" in data


def test_create_board_appears_in_list(auth_client: TestClient) -> None:
    auth_client.post("/api/boards", json={"name": "New Board"})
    boards = auth_client.get("/api/boards").json()
    names = [b["name"] for b in boards]
    assert "New Board" in names


def test_create_board_empty_name_rejected(auth_client: TestClient) -> None:
    response = auth_client.post("/api/boards", json={"name": "   "})
    assert response.status_code == 400


def test_create_board_unauthenticated(client: TestClient) -> None:
    # Note: no auth_client/default_board_id dependency to avoid session contamination
    response = client.post("/api/boards", json={"name": "Test"})
    assert response.status_code == 401


# --- Board rename tests ---

def test_rename_board(auth_client: TestClient, default_board_id: int) -> None:
    response = auth_client.patch(
        f"/api/boards/{default_board_id}/name", json={"name": "Renamed Board"}
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Renamed Board"


def test_rename_board_appears_in_list(auth_client: TestClient, default_board_id: int) -> None:
    auth_client.patch(f"/api/boards/{default_board_id}/name", json={"name": "Shiny Board"})
    boards = auth_client.get("/api/boards").json()
    names = [b["name"] for b in boards]
    assert "Shiny Board" in names


def test_rename_board_empty_name_rejected(auth_client: TestClient, default_board_id: int) -> None:
    response = auth_client.patch(
        f"/api/boards/{default_board_id}/name", json={"name": ""}
    )
    assert response.status_code == 400


# --- Board delete tests ---

def test_delete_board_only_board_rejected(auth_client: TestClient, default_board_id: int) -> None:
    response = auth_client.delete(f"/api/boards/{default_board_id}")
    assert response.status_code == 400


def test_delete_board_success(auth_client: TestClient, default_board_id: int) -> None:
    extra = auth_client.post("/api/boards", json={"name": "Extra"}).json()
    response = auth_client.delete(f"/api/boards/{extra['id']}")
    assert response.status_code == 204
    boards = auth_client.get("/api/boards").json()
    ids = [b["id"] for b in boards]
    assert extra["id"] not in ids


def test_delete_board_unauthenticated(client: TestClient) -> None:
    response = client.delete("/api/boards/1")
    assert response.status_code == 401


def test_delete_board_not_found(auth_client: TestClient) -> None:
    response = auth_client.delete("/api/boards/99999")
    assert response.status_code == 404


# --- Cross-user isolation test ---

def test_other_user_cannot_access_board(
    client: TestClient, default_board_id: int
) -> None:
    client.post(
        "/api/auth/register",
        json={"username": "otheruser", "password": "secret123"},
    )
    client.post(
        "/api/auth/login",
        json={"username": "otheruser", "password": "secret123"},
    )
    response = client.get(f"/api/boards/{default_board_id}")
    assert response.status_code == 404


# --- Card priority and due_date tests ---

def test_put_board_with_card_priority_and_due_date(
    auth_client: TestClient, default_board_id: int
) -> None:
    board = {
        "columns": [{"id": "col-1", "title": "Work", "cardIds": ["c1"]}],
        "cards": {
            "c1": {
                "id": "c1",
                "title": "Task",
                "details": "Do it",
                "priority": "high",
                "due_date": "2026-12-31",
            }
        },
    }
    resp = auth_client.put(f"/api/boards/{default_board_id}", json=board)
    assert resp.status_code == 200
    card = resp.json()["cards"]["c1"]
    assert card["priority"] == "high"
    assert card["due_date"] == "2026-12-31"


def test_put_board_card_priority_invalid_value_rejected(
    auth_client: TestClient, default_board_id: int
) -> None:
    board = {
        "columns": [{"id": "col-1", "title": "Work", "cardIds": ["c1"]}],
        "cards": {
            "c1": {
                "id": "c1",
                "title": "Task",
                "details": "Do it",
                "priority": "urgent",  # not a valid literal
            }
        },
    }
    resp = auth_client.put(f"/api/boards/{default_board_id}", json=board)
    assert resp.status_code == 422


def test_put_board_card_optional_fields_default_to_none(
    auth_client: TestClient, default_board_id: int
) -> None:
    board = {
        "columns": [{"id": "col-1", "title": "Work", "cardIds": ["c1"]}],
        "cards": {"c1": {"id": "c1", "title": "Task", "details": "Do it"}},
    }
    resp = auth_client.put(f"/api/boards/{default_board_id}", json=board)
    assert resp.status_code == 200
    card = resp.json()["cards"]["c1"]
    assert card["priority"] is None
    assert card["due_date"] is None


# --- Card labels tests ---


def test_put_board_card_labels_saved_and_returned(
    auth_client: TestClient, default_board_id: int
) -> None:
    board = {
        "columns": [{"id": "col-1", "title": "Work", "cardIds": ["c1"]}],
        "cards": {
            "c1": {
                "id": "c1",
                "title": "Labeled",
                "details": "With labels",
                "labels": ["bug", "frontend"],
            }
        },
    }
    resp = auth_client.put(f"/api/boards/{default_board_id}", json=board)
    assert resp.status_code == 200
    card = resp.json()["cards"]["c1"]
    assert card["labels"] == ["bug", "frontend"]


def test_put_board_card_labels_defaults_to_empty_list(
    auth_client: TestClient, default_board_id: int
) -> None:
    board = {
        "columns": [{"id": "col-1", "title": "Work", "cardIds": ["c1"]}],
        "cards": {"c1": {"id": "c1", "title": "No labels", "details": "No labels here"}},
    }
    resp = auth_client.put(f"/api/boards/{default_board_id}", json=board)
    assert resp.status_code == 200
    card = resp.json()["cards"]["c1"]
    assert card["labels"] == []


def test_get_board_returns_labels(
    auth_client: TestClient, default_board_id: int
) -> None:
    board = {
        "columns": [{"id": "col-1", "title": "Work", "cardIds": ["c1"]}],
        "cards": {
            "c1": {
                "id": "c1",
                "title": "Tagged",
                "details": "Has labels",
                "labels": ["feature", "backend"],
            }
        },
    }
    auth_client.put(f"/api/boards/{default_board_id}", json=board)
    resp = auth_client.get(f"/api/boards/{default_board_id}")
    assert resp.status_code == 200
    card = resp.json()["cards"]["c1"]
    assert card["labels"] == ["feature", "backend"]


# --- Card checklist tests ---


def test_put_board_card_checklist_saved_and_returned(
    auth_client: TestClient, default_board_id: int
) -> None:
    board = {
        "columns": [{"id": "col-1", "title": "Work", "cardIds": ["c1"]}],
        "cards": {
            "c1": {
                "id": "c1",
                "title": "Task",
                "details": "With checklist",
                "checklist": [
                    {"id": "item-1", "text": "Step one", "done": False},
                    {"id": "item-2", "text": "Step two", "done": True},
                ],
            }
        },
    }
    resp = auth_client.put(f"/api/boards/{default_board_id}", json=board)
    assert resp.status_code == 200
    card = resp.json()["cards"]["c1"]
    assert len(card["checklist"]) == 2
    assert card["checklist"][0] == {"id": "item-1", "text": "Step one", "done": False}
    assert card["checklist"][1] == {"id": "item-2", "text": "Step two", "done": True}


def test_put_board_card_checklist_defaults_to_empty(
    auth_client: TestClient, default_board_id: int
) -> None:
    board = {
        "columns": [{"id": "col-1", "title": "Work", "cardIds": ["c1"]}],
        "cards": {"c1": {"id": "c1", "title": "No checklist", "details": "Plain card"}},
    }
    resp = auth_client.put(f"/api/boards/{default_board_id}", json=board)
    assert resp.status_code == 200
    card = resp.json()["cards"]["c1"]
    assert card["checklist"] == []


def test_get_board_returns_checklist(
    auth_client: TestClient, default_board_id: int
) -> None:
    board = {
        "columns": [{"id": "col-1", "title": "Work", "cardIds": ["c1"]}],
        "cards": {
            "c1": {
                "id": "c1",
                "title": "Checklist card",
                "details": "Check this",
                "checklist": [{"id": "item-a", "text": "Do it", "done": True}],
            }
        },
    }
    auth_client.put(f"/api/boards/{default_board_id}", json=board)
    resp = auth_client.get(f"/api/boards/{default_board_id}")
    assert resp.status_code == 200
    card = resp.json()["cards"]["c1"]
    assert card["checklist"] == [{"id": "item-a", "text": "Do it", "done": True}]
