import logging
import sqlite3

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ValidationError

from app.ai import AIChatResponse
from app.ai import chat as ai_chat
from app.auth import get_current_user
from app.board import BoardData
from app.database import get_db

router = APIRouter(prefix="/api/ai")
logger = logging.getLogger(__name__)

_MAX_HISTORY_MESSAGES = 40  # 20 conversation turns (user + assistant pairs)

_SYSTEM_PROMPT = (
    "You are a helpful Kanban board assistant. "
    "When the user asks you to modify the board, return the complete updated board in the 'board' field "
    "with all columns and cards included — even those that were not changed. "
    "Represent cards as a flat list (not a dict). "
    "When the user is asking a question or having a general conversation, "
    "leave 'board' as null and only return a message. "
    "Always include a clear 'message' explaining what you did or answering the question."
)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []


class ChatResponse(BaseModel):
    message: str
    board: BoardData | None = None


@router.post("/chat")
def ai_chat_endpoint(
    body: ChatRequest,
    current_user: str = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> ChatResponse:
    row = db.execute(
        "SELECT b.content FROM boards b JOIN users u ON b.user_id = u.id WHERE u.username = ?",
        [current_user],
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Board not found")

    board_json = row["content"]
    system_content = f"{_SYSTEM_PROMPT}\n\nCurrent board (JSON):\n{board_json}"

    messages: list[dict] = [{"role": "system", "content": system_content}]
    for msg in body.history[-_MAX_HISTORY_MESSAGES:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": body.message})

    ai_response: AIChatResponse = ai_chat(messages)

    saved_board: BoardData | None = None
    if ai_response.board is not None:
        try:
            card_ids = [c.id for c in ai_response.board.cards]
            if len(card_ids) != len(set(card_ids)):
                raise ValueError("AI response contains duplicate card IDs")
            board_dict = {
                "columns": [c.model_dump() for c in ai_response.board.columns],
                "cards": {c.id: c.model_dump() for c in ai_response.board.cards},
            }
            validated = BoardData.model_validate(board_dict)
            db.execute(
                """
                UPDATE boards
                SET content = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                WHERE user_id = (SELECT id FROM users WHERE username = ?)
                """,
                [validated.model_dump_json(), current_user],
            )
            db.commit()
            saved_board = validated
        except ValidationError as exc:
            logger.warning("AI board validation failed: %s", exc)
            saved_board = None
        except Exception as exc:
            logger.error("Unexpected error saving AI board update: %s", exc, exc_info=True)
            saved_board = None

    return ChatResponse(message=ai_response.message, board=saved_board)
