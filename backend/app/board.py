import sqlite3

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, model_validator

from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api")


class Card(BaseModel):
    id: str
    title: str
    details: str


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


def _fetch_board_content(db: sqlite3.Connection, username: str) -> str:
    row = db.execute(
        "SELECT b.content FROM boards b JOIN users u ON b.user_id = u.id WHERE u.username = ?",
        [username],
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Board not found")
    return row["content"]


def _save_board_content(db: sqlite3.Connection, username: str, content: str) -> bool:
    cursor = db.execute(
        """
        UPDATE boards
        SET content = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE user_id = (SELECT id FROM users WHERE username = ?)
        """,
        [content, username],
    )
    db.commit()
    return cursor.rowcount > 0


@router.get("/board")
def get_board(
    current_user: str = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> BoardData:
    return BoardData.model_validate_json(_fetch_board_content(db, current_user))


@router.put("/board")
def update_board(
    body: BoardData,
    current_user: str = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> BoardData:
    if not _save_board_content(db, current_user, body.model_dump_json()):
        raise HTTPException(status_code=404, detail="Board not found")
    return body
