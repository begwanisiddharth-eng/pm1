from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.ai import AIChatBoard, AIChatCard, AIChatColumn, AIChatResponse


# --- Unauthenticated access ---

def test_ai_chat_unauthenticated(client: TestClient) -> None:
    resp = client.post("/api/ai/chat", json={"message": "hi", "board_id": 1})
    assert resp.status_code == 401


# --- Board ownership ---

def test_ai_chat_wrong_board_id(auth_client: TestClient) -> None:
    mock_resp = AIChatResponse(message="hello", board=None)
    with patch("app.ai_router.ai_chat", return_value=mock_resp):
        resp = auth_client.post(
            "/api/ai/chat",
            json={"message": "hi", "board_id": 99999},
        )
    assert resp.status_code == 404


# --- Message-only response (board=null) ---

def test_ai_chat_message_only(auth_client: TestClient, default_board_id: int) -> None:
    mock_resp = AIChatResponse(message="I can help with that.", board=None)
    with patch("app.ai_router.ai_chat", return_value=mock_resp):
        resp = auth_client.post(
            "/api/ai/chat",
            json={"message": "Hello", "history": [], "board_id": default_board_id},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["message"] == "I can help with that."
    assert data["board"] is None


# --- Board update response ---

def test_ai_chat_board_update_saved(auth_client: TestClient, default_board_id: int) -> None:
    ai_board = AIChatBoard(
        columns=[AIChatColumn(id="col-backlog", title="Backlog", cardIds=["card-1"])],
        cards=[AIChatCard(id="card-1", title="AI Card", details="Created by AI")],
    )
    mock_resp = AIChatResponse(message="Updated!", board=ai_board)
    with patch("app.ai_router.ai_chat", return_value=mock_resp):
        resp = auth_client.post(
            "/api/ai/chat",
            json={"message": "Add a card", "history": [], "board_id": default_board_id},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["message"] == "Updated!"
    assert data["board"] is not None
    col_titles = [c["title"] for c in data["board"]["columns"]]
    assert "Backlog" in col_titles

    # Verify the board was actually persisted
    get_resp = auth_client.get(f"/api/boards/{default_board_id}")
    assert get_resp.status_code == 200
    saved = get_resp.json()
    assert any(c["title"] == "Backlog" for c in saved["columns"])


def test_ai_chat_board_update_preserves_metadata(
    auth_client: TestClient, default_board_id: int
) -> None:
    """AI updating title/details must not erase priority, due_date, labels, etc."""
    board_with_meta = {
        "columns": [{"id": "col-1", "title": "Work", "cardIds": ["c1"]}],
        "cards": {
            "c1": {
                "id": "c1",
                "title": "Original",
                "details": "Original details",
                "priority": "high",
                "due_date": "2026-12-31",
                "labels": ["bug"],
                "color": "#ef4444",
            }
        },
    }
    auth_client.put(f"/api/boards/{default_board_id}", json=board_with_meta)

    ai_board = AIChatBoard(
        columns=[AIChatColumn(id="col-1", title="Work", cardIds=["c1"])],
        cards=[AIChatCard(id="c1", title="AI Renamed", details="New details")],
    )
    mock_resp = AIChatResponse(message="Renamed.", board=ai_board)
    with patch("app.ai_router.ai_chat", return_value=mock_resp):
        resp = auth_client.post(
            "/api/ai/chat",
            json={"message": "Rename the card", "history": [], "board_id": default_board_id},
        )
    assert resp.status_code == 200
    card = resp.json()["board"]["cards"]["c1"]
    assert card["title"] == "AI Renamed"
    assert card["priority"] == "high"
    assert card["due_date"] == "2026-12-31"
    assert card["labels"] == ["bug"]
    assert card["color"] == "#ef4444"


def test_ai_chat_duplicate_card_ids_discarded(
    auth_client: TestClient, default_board_id: int
) -> None:
    ai_board = AIChatBoard(
        columns=[AIChatColumn(id="col-backlog", title="Backlog", cardIds=["c1", "c1"])],
        cards=[
            AIChatCard(id="c1", title="Dup A", details=""),
            AIChatCard(id="c1", title="Dup B", details=""),
        ],
    )
    mock_resp = AIChatResponse(message="Oops duplicate.", board=ai_board)
    with patch("app.ai_router.ai_chat", return_value=mock_resp):
        resp = auth_client.post(
            "/api/ai/chat",
            json={"message": "test", "history": [], "board_id": default_board_id},
        )
    assert resp.status_code == 200
    assert resp.json()["board"] is None


def test_ai_chat_history_too_long_rejected(
    auth_client: TestClient, default_board_id: int
) -> None:
    history = [{"role": "user", "content": f"msg {i}"} for i in range(201)]
    resp = auth_client.post(
        "/api/ai/chat",
        json={"message": "hi", "history": history, "board_id": default_board_id},
    )
    assert resp.status_code == 422


def test_ai_chat_history_at_limit_accepted(
    auth_client: TestClient, default_board_id: int
) -> None:
    history = [{"role": "user", "content": f"msg {i}"} for i in range(200)]
    mock_resp = AIChatResponse(message="ok", board=None)
    with patch("app.ai_router.ai_chat", return_value=mock_resp):
        resp = auth_client.post(
            "/api/ai/chat",
            json={"message": "hi", "history": history, "board_id": default_board_id},
        )
    assert resp.status_code == 200


def test_ai_chat_archived_cards_preserved_after_board_update(
    auth_client: TestClient, default_board_id: int
) -> None:
    board_with_archive = {
        "columns": [{"id": "col-1", "title": "Active", "cardIds": ["c1"]}],
        "cards": {
            "c1": {"id": "c1", "title": "Active Card", "details": ""},
            "c2": {"id": "c2", "title": "Archived Card", "details": "", "archived": True},
        },
        "archivedCardIds": ["c2"],
    }
    auth_client.put(f"/api/boards/{default_board_id}", json=board_with_archive)

    ai_board = AIChatBoard(
        columns=[AIChatColumn(id="col-1", title="Active", cardIds=["c1"])],
        cards=[AIChatCard(id="c1", title="Active Card", details="")],
    )
    mock_resp = AIChatResponse(message="Done.", board=ai_board)
    with patch("app.ai_router.ai_chat", return_value=mock_resp):
        resp = auth_client.post(
            "/api/ai/chat",
            json={"message": "review", "history": [], "board_id": default_board_id},
        )
    assert resp.status_code == 200
    board = resp.json()["board"]
    assert board is not None
    assert "c2" in board["archivedCardIds"]
    assert "c2" in board["cards"]


# --- Card field validators (via PUT board endpoint) ---

def test_board_rejects_invalid_color(auth_client: TestClient, default_board_id: int) -> None:
    board = {
        "columns": [{"id": "col-1", "title": "Work", "cardIds": ["c1"]}],
        "cards": {"c1": {"id": "c1", "title": "T", "details": "D", "color": "red"}},
    }
    resp = auth_client.put(f"/api/boards/{default_board_id}", json=board)
    assert resp.status_code == 422


def test_board_accepts_valid_color(auth_client: TestClient, default_board_id: int) -> None:
    board = {
        "columns": [{"id": "col-1", "title": "Work", "cardIds": ["c1"]}],
        "cards": {"c1": {"id": "c1", "title": "T", "details": "D", "color": "#ef4444"}},
    }
    resp = auth_client.put(f"/api/boards/{default_board_id}", json=board)
    assert resp.status_code == 200
    assert resp.json()["cards"]["c1"]["color"] == "#ef4444"


def test_board_rejects_invalid_due_date(auth_client: TestClient, default_board_id: int) -> None:
    board = {
        "columns": [{"id": "col-1", "title": "Work", "cardIds": ["c1"]}],
        "cards": {"c1": {"id": "c1", "title": "T", "details": "D", "due_date": "not-a-date"}},
    }
    resp = auth_client.put(f"/api/boards/{default_board_id}", json=board)
    assert resp.status_code == 422


def test_board_accepts_valid_due_date(auth_client: TestClient, default_board_id: int) -> None:
    board = {
        "columns": [{"id": "col-1", "title": "Work", "cardIds": ["c1"]}],
        "cards": {"c1": {"id": "c1", "title": "T", "details": "D", "due_date": "2026-12-31"}},
    }
    resp = auth_client.put(f"/api/boards/{default_board_id}", json=board)
    assert resp.status_code == 200
    assert resp.json()["cards"]["c1"]["due_date"] == "2026-12-31"


def test_rename_board_updates_timestamp(auth_client: TestClient, default_board_id: int) -> None:
    before = auth_client.get("/api/boards").json()[0]["updated_at"]
    import time; time.sleep(0.01)
    auth_client.patch(f"/api/boards/{default_board_id}/name", json={"name": "Renamed"})
    after = auth_client.get("/api/boards").json()[0]["updated_at"]
    assert after >= before
    assert auth_client.get("/api/boards").json()[0]["name"] == "Renamed"
