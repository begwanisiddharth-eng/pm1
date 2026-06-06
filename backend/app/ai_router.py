import json
import logging
import sqlite3
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, ValidationError

from app.ai import AIChatResponse
from app.ai import chat as ai_chat
from app.auth import get_current_user
from app.board import BoardData, fetch_board_content, save_board_content, _get_owned_board
from app.database import get_db

router = APIRouter(prefix="/api/ai")
logger = logging.getLogger(__name__)

_MAX_HISTORY_MESSAGES = 40

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
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = Field(default=[], max_length=200)
    board_id: int


class ChatResponse(BaseModel):
    message: str
    board: BoardData | None = None


@router.post("/chat")
def ai_chat_endpoint(
    body: ChatRequest,
    current_user: str = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> ChatResponse:
    _get_owned_board(db, body.board_id, current_user)

    board_json = fetch_board_content(db, body.board_id)
    # Build an AI-visible board that excludes archived cards
    existing_board_full = BoardData.model_validate_json(board_json)
    archived_ids = set(existing_board_full.archivedCardIds)
    ai_board_dict = {
        "columns": [c.model_dump() for c in existing_board_full.columns],
        "cards": {
            k: v.model_dump()
            for k, v in existing_board_full.cards.items()
            if k not in archived_ids
        },
    }
    # Use json.dumps directly — avoids calling BoardData.model_validate before the AI response
    ai_board_json = json.dumps(ai_board_dict)
    system_content = f"{_SYSTEM_PROMPT}\n\nCurrent board (JSON):\n{ai_board_json}"

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

            # Preserve card metadata from existing board
            existing_cards = existing_board_full.cards

            cards_dict: dict[str, dict] = {}
            for ai_card in ai_response.board.cards:
                existing = existing_cards.get(ai_card.id)
                if existing:
                    # Preserve all metadata; AI only changes title and details
                    card_dict = existing.model_dump()
                    card_dict["title"] = ai_card.title
                    card_dict["details"] = ai_card.details
                else:
                    card_dict = ai_card.model_dump()
                cards_dict[ai_card.id] = card_dict

            # Carry archived cards back into the merged board
            for aid in existing_board_full.archivedCardIds:
                if aid in existing_cards:
                    cards_dict[aid] = existing_cards[aid].model_dump()

            board_dict = {
                "columns": [c.model_dump() for c in ai_response.board.columns],
                "cards": cards_dict,
                "description": existing_board_full.description,
                "archivedCardIds": existing_board_full.archivedCardIds,
            }
            validated = BoardData.model_validate(board_dict)
            if save_board_content(db, body.board_id, validated.model_dump_json()):
                saved_board = validated
            else:
                logger.error("AI board update found no row for board_id %s", body.board_id)
        except ValidationError as exc:
            logger.warning("AI board validation failed: %s", exc)
            saved_board = None
        except Exception as exc:
            logger.error("Unexpected error saving AI board update: %s", exc, exc_info=True)
            saved_board = None

    return ChatResponse(message=ai_response.message, board=saved_board)
