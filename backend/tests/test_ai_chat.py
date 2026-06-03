import json
import sqlite3
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.ai import AIChatBoard, AIChatCard, AIChatColumn, AIChatResponse
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


def test_ai_chat_unauthenticated(client: TestClient) -> None:
    response = client.post("/api/ai/chat", json={"message": "hello"})
    assert response.status_code == 401


def test_ai_chat_message_only(auth_client: TestClient) -> None:
    mock_response = AIChatResponse(message="A Kanban board helps you visualize work.", board=None)
    with patch("app.ai_router.ai_chat", return_value=mock_response):
        response = auth_client.post(
            "/api/ai/chat",
            json={"message": "What is a Kanban board?"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "A Kanban board helps you visualize work."
    assert data["board"] is None


def test_ai_chat_valid_board_update(
    auth_client: TestClient, test_db: sqlite3.Connection
) -> None:
    new_board = AIChatBoard(
        columns=[AIChatColumn(id="col-1", title="Only Column", cardIds=[])],
        cards=[],
    )
    mock_response = AIChatResponse(message="I've simplified the board.", board=new_board)
    with patch("app.ai_router.ai_chat", return_value=mock_response):
        response = auth_client.post(
            "/api/ai/chat",
            json={"message": "Simplify the board to one empty column."},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "I've simplified the board."
    assert data["board"] is not None
    assert data["board"]["columns"][0]["title"] == "Only Column"
    assert data["board"]["cards"] == {}
    # Verify the DB was updated
    row = test_db.execute(
        "SELECT b.content FROM boards b JOIN users u ON b.user_id = u.id WHERE u.username = 'user'"
    ).fetchone()
    saved = json.loads(row["content"])
    assert len(saved["columns"]) == 1
    assert saved["columns"][0]["title"] == "Only Column"


def test_ai_chat_invalid_board_does_not_overwrite(
    auth_client: TestClient, test_db: sqlite3.Connection
) -> None:
    original = test_db.execute(
        "SELECT b.content FROM boards b JOIN users u ON b.user_id = u.id WHERE u.username = 'user'"
    ).fetchone()["content"]

    bad_board = AIChatBoard(
        columns=[AIChatColumn(id="col-x", title="Bogus", cardIds=[])],
        cards=[],
    )
    mock_response = AIChatResponse(message="Done!", board=bad_board)

    with patch("app.ai_router.ai_chat", return_value=mock_response):
        with patch(
            "app.ai_router.BoardData.model_validate",
            side_effect=ValueError("simulated validation failure"),
        ):
            response = auth_client.post("/api/ai/chat", json={"message": "do something"})

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Done!"
    assert data["board"] is None  # board not returned when save fails

    # DB must be unchanged
    after = test_db.execute(
        "SELECT b.content FROM boards b JOIN users u ON b.user_id = u.id WHERE u.username = 'user'"
    ).fetchone()["content"]
    assert after == original


def test_ai_chat_passes_history_to_ai(auth_client: TestClient) -> None:
    captured: list[list[dict]] = []

    def capture_and_respond(messages: list[dict]) -> AIChatResponse:
        captured.append(messages)
        return AIChatResponse(message="Got it.", board=None)

    with patch("app.ai_router.ai_chat", side_effect=capture_and_respond):
        auth_client.post(
            "/api/ai/chat",
            json={
                "message": "What about now?",
                "history": [
                    {"role": "user", "content": "Earlier question"},
                    {"role": "assistant", "content": "Earlier answer"},
                ],
            },
        )

    assert len(captured) == 1
    messages = captured[0]
    roles = [m["role"] for m in messages]
    assert roles[0] == "system"
    assert roles[1] == "user"
    assert roles[2] == "assistant"
    assert roles[3] == "user"
    assert messages[3]["content"] == "What about now?"
