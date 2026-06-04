import json
import sqlite3
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.ai import AIChatBoard, AIChatColumn, AIChatResponse


def test_ai_chat_unauthenticated(client: TestClient) -> None:
    response = client.post(
        "/api/ai/chat", json={"message": "hello", "board_id": 1}
    )
    assert response.status_code == 401


def test_ai_chat_message_only(auth_client: TestClient, default_board_id: int) -> None:
    mock_response = AIChatResponse(message="A Kanban board helps you visualize work.", board=None)
    with patch("app.ai_router.ai_chat", return_value=mock_response):
        response = auth_client.post(
            "/api/ai/chat",
            json={"message": "What is a Kanban board?", "board_id": default_board_id},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "A Kanban board helps you visualize work."
    assert data["board"] is None


def test_ai_chat_valid_board_update(
    auth_client: TestClient, test_db: sqlite3.Connection, default_board_id: int
) -> None:
    new_board = AIChatBoard(
        columns=[AIChatColumn(id="col-1", title="Only Column", cardIds=[])],
        cards=[],
    )
    mock_response = AIChatResponse(message="I've simplified the board.", board=new_board)
    with patch("app.ai_router.ai_chat", return_value=mock_response):
        response = auth_client.post(
            "/api/ai/chat",
            json={"message": "Simplify the board to one empty column.", "board_id": default_board_id},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "I've simplified the board."
    assert data["board"] is not None
    assert data["board"]["columns"][0]["title"] == "Only Column"
    assert data["board"]["cards"] == {}
    row = test_db.execute(
        "SELECT content FROM boards WHERE id = ?", [default_board_id]
    ).fetchone()
    saved = json.loads(row["content"])
    assert len(saved["columns"]) == 1
    assert saved["columns"][0]["title"] == "Only Column"


def test_ai_chat_invalid_board_does_not_overwrite(
    auth_client: TestClient, test_db: sqlite3.Connection, default_board_id: int
) -> None:
    original = test_db.execute(
        "SELECT content FROM boards WHERE id = ?", [default_board_id]
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
            response = auth_client.post(
                "/api/ai/chat",
                json={"message": "do something", "board_id": default_board_id},
            )

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Done!"
    assert data["board"] is None

    after = test_db.execute(
        "SELECT content FROM boards WHERE id = ?", [default_board_id]
    ).fetchone()["content"]
    assert after == original


def test_ai_chat_passes_history_to_ai(auth_client: TestClient, default_board_id: int) -> None:
    captured: list[list[dict]] = []

    def capture_and_respond(messages: list[dict]) -> AIChatResponse:
        captured.append(messages)
        return AIChatResponse(message="Got it.", board=None)

    with patch("app.ai_router.ai_chat", side_effect=capture_and_respond):
        auth_client.post(
            "/api/ai/chat",
            json={
                "message": "What about now?",
                "board_id": default_board_id,
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


def test_ai_chat_board_not_found(auth_client: TestClient) -> None:
    mock_response = AIChatResponse(message="Hi", board=None)
    with patch("app.ai_router.ai_chat", return_value=mock_response):
        response = auth_client.post(
            "/api/ai/chat",
            json={"message": "hello", "board_id": 99999},
        )
    assert response.status_code == 404
