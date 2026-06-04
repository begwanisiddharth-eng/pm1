import json
import sqlite3
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, model_validator

from app.auth import get_current_user
from app.database import get_db, _EMPTY_BOARD

router = APIRouter(prefix="/api")


class Card(BaseModel):
    id: str
    title: str
    details: str
    priority: Literal["low", "medium", "high", "critical"] | None = None
    due_date: str | None = None


class Column(BaseModel):
    id: str
    title: str
    cardIds: list[str]


class BoardData(BaseModel):
    columns: list[Column]
    cards: dict[str, Card]

    @model_validator(mode="after")
    def check_card_refs(self) -> "BoardData":
        referenced = {cid for col in self.columns for cid in col.cardIds}
        defined = set(self.cards.keys())
        if referenced != defined:
            dangling = referenced - defined
            orphaned = defined - referenced
            raise ValueError(
                f"cardIds/cards mismatch: dangling={dangling}, orphaned={orphaned}"
            )
        return self


class BoardSummary(BaseModel):
    id: int
    name: str
    updated_at: str


class CreateBoardRequest(BaseModel):
    name: str


class RenameBoardRequest(BaseModel):
    name: str


def _get_user_id(db: sqlite3.Connection, username: str) -> int:
    row = db.execute("SELECT id FROM users WHERE username = ?", [username]).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row["id"]


def _verify_board_ownership(db: sqlite3.Connection, board_id: int, user_id: int) -> None:
    row = db.execute(
        "SELECT 1 FROM boards WHERE id = ? AND user_id = ?",
        [board_id, user_id],
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Board not found")


def fetch_board_content(db: sqlite3.Connection, board_id: int) -> str:
    row = db.execute("SELECT content FROM boards WHERE id = ?", [board_id]).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Board not found")
    return row["content"]


def save_board_content(db: sqlite3.Connection, board_id: int, content: str) -> bool:
    cursor = db.execute(
        """
        UPDATE boards
        SET content = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?
        """,
        [content, board_id],
    )
    db.commit()
    return cursor.rowcount > 0


@router.get("/boards")
def list_boards(
    current_user: str = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> list[BoardSummary]:
    user_id = _get_user_id(db, current_user)
    rows = db.execute(
        "SELECT id, name, updated_at FROM boards WHERE user_id = ? ORDER BY updated_at DESC",
        [user_id],
    ).fetchall()
    return [BoardSummary(id=r["id"], name=r["name"], updated_at=r["updated_at"]) for r in rows]


@router.post("/boards", status_code=201)
def create_board(
    body: CreateBoardRequest,
    current_user: str = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> BoardSummary:
    user_id = _get_user_id(db, current_user)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Board name cannot be empty")
    cursor = db.execute(
        "INSERT INTO boards (user_id, name, content) VALUES (?, ?, ?)",
        [user_id, name, json.dumps(_EMPTY_BOARD)],
    )
    db.commit()
    board_id = cursor.lastrowid
    row = db.execute(
        "SELECT id, name, updated_at FROM boards WHERE id = ?", [board_id]
    ).fetchone()
    return BoardSummary(id=row["id"], name=row["name"], updated_at=row["updated_at"])


@router.get("/boards/{board_id}")
def get_board(
    board_id: int,
    current_user: str = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> BoardData:
    user_id = _get_user_id(db, current_user)
    _verify_board_ownership(db, board_id, user_id)
    return BoardData.model_validate_json(fetch_board_content(db, board_id))


@router.put("/boards/{board_id}")
def update_board(
    board_id: int,
    body: BoardData,
    current_user: str = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> BoardData:
    user_id = _get_user_id(db, current_user)
    _verify_board_ownership(db, board_id, user_id)
    save_board_content(db, board_id, body.model_dump_json())
    return body


@router.patch("/boards/{board_id}/name")
def rename_board(
    board_id: int,
    body: RenameBoardRequest,
    current_user: str = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> BoardSummary:
    user_id = _get_user_id(db, current_user)
    _verify_board_ownership(db, board_id, user_id)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Board name cannot be empty")
    db.execute(
        "UPDATE boards SET name = ? WHERE id = ?",
        [name, board_id],
    )
    db.commit()
    row = db.execute(
        "SELECT id, name, updated_at FROM boards WHERE id = ?", [board_id]
    ).fetchone()
    return BoardSummary(id=row["id"], name=row["name"], updated_at=row["updated_at"])


@router.delete("/boards/{board_id}", status_code=204)
def delete_board(
    board_id: int,
    current_user: str = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> None:
    user_id = _get_user_id(db, current_user)
    _verify_board_ownership(db, board_id, user_id)
    count = db.execute(
        "SELECT COUNT(*) FROM boards WHERE user_id = ?", [user_id]
    ).fetchone()[0]
    if count <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete your only board")
    db.execute("DELETE FROM boards WHERE id = ?", [board_id])
    db.commit()
