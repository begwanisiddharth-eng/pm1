import sqlite3

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

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


@router.get("/board")
def get_board(
    current_user: str = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> BoardData:
    row = db.execute(
        "SELECT b.content FROM boards b JOIN users u ON b.user_id = u.id WHERE u.username = ?",
        [current_user],
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Board not found")
    return BoardData.model_validate_json(row["content"])


@router.put("/board")
def update_board(
    body: BoardData,
    current_user: str = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
) -> BoardData:
    db.execute(
        """
        UPDATE boards
        SET content = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE user_id = (SELECT id FROM users WHERE username = ?)
        """,
        [body.model_dump_json(), current_user],
    )
    db.commit()
    return body
