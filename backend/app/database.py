import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "pm.db"

_SEED_BOARD = {
    "columns": [
        {"id": "col-backlog",   "title": "Backlog",     "cardIds": ["card-1", "card-2"]},
        {"id": "col-discovery", "title": "Discovery",   "cardIds": ["card-3"]},
        {"id": "col-progress",  "title": "In Progress", "cardIds": ["card-4", "card-5"]},
        {"id": "col-review",    "title": "Review",      "cardIds": ["card-6"]},
        {"id": "col-done",      "title": "Done",        "cardIds": ["card-7", "card-8"]},
    ],
    "cards": {
        "card-1": {"id": "card-1", "title": "Align roadmap themes",    "details": "Draft quarterly themes with impact statements and metrics."},
        "card-2": {"id": "card-2", "title": "Gather customer signals", "details": "Review support tags, sales notes, and churn feedback."},
        "card-3": {"id": "card-3", "title": "Prototype analytics view","details": "Sketch initial dashboard layout and key drill-downs."},
        "card-4": {"id": "card-4", "title": "Refine status language",  "details": "Standardize column labels and tone across the board."},
        "card-5": {"id": "card-5", "title": "Design card layout",      "details": "Add hierarchy and spacing for scanning dense lists."},
        "card-6": {"id": "card-6", "title": "QA micro-interactions",   "details": "Verify hover, focus, and loading states."},
        "card-7": {"id": "card-7", "title": "Ship marketing page",     "details": "Final copy approved and asset pack delivered."},
        "card-8": {"id": "card-8", "title": "Close onboarding sprint", "details": "Document release notes and share internally."},
    },
}


def init_db(path: Path = DB_PATH) -> None:
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            username   TEXT    NOT NULL UNIQUE,
            created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );
        CREATE TABLE IF NOT EXISTS boards (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL REFERENCES users(id),
            content    TEXT    NOT NULL,
            updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );
    """)
    conn.execute("INSERT OR IGNORE INTO users (username) VALUES (?)", ["user"])
    user_id = conn.execute("SELECT id FROM users WHERE username = ?", ["user"]).fetchone()[0]
    board_exists = conn.execute("SELECT 1 FROM boards WHERE user_id = ?", [user_id]).fetchone()
    if not board_exists:
        conn.execute(
            "INSERT INTO boards (user_id, content) VALUES (?, ?)",
            [user_id, json.dumps(_SEED_BOARD)],
        )
    conn.commit()
    conn.close()


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()
