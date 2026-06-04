import hashlib
import hmac
import json
import os
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

_EMPTY_BOARD = {
    "columns": [
        {"id": "col-todo",        "title": "To Do",       "cardIds": []},
        {"id": "col-in-progress", "title": "In Progress", "cardIds": []},
        {"id": "col-done",        "title": "Done",        "cardIds": []},
    ],
    "cards": {},
}


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return f"pbkdf2:sha256:100000:{salt}:{key.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        _, alg, iterations, salt, key_hex = stored_hash.split(":")
        key = hashlib.pbkdf2_hmac(alg, password.encode(), salt.encode(), int(iterations))
        return hmac.compare_digest(key.hex(), key_hex)
    except Exception:
        return False


def init_db(path: Path = DB_PATH) -> None:
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT    NOT NULL UNIQUE,
            password_hash TEXT    NOT NULL DEFAULT '',
            created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );
        CREATE TABLE IF NOT EXISTS boards (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL REFERENCES users(id),
            name       TEXT    NOT NULL DEFAULT 'My Board',
            content    TEXT    NOT NULL,
            updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );
    """)

    # Migration: add password_hash column to users if missing (older schema)
    existing_user_cols = {row[1] for row in conn.execute("PRAGMA table_info(users)")}
    if "password_hash" not in existing_user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''")

    # Migration: add name column to boards if missing (older schema)
    existing_board_cols = {row[1] for row in conn.execute("PRAGMA table_info(boards)")}
    if "name" not in existing_board_cols:
        conn.execute("ALTER TABLE boards ADD COLUMN name TEXT NOT NULL DEFAULT 'Main Board'")

    # Seed the default user with a hashed password
    row = conn.execute(
        "SELECT id, password_hash FROM users WHERE username = 'user'"
    ).fetchone()
    if row is None:
        ph = hash_password("password")
        conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            ["user", ph],
        )
    elif row[1] == "":
        # Upgrade legacy empty password_hash
        ph = hash_password("password")
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE username = 'user'",
            [ph],
        )

    user_id = conn.execute(
        "SELECT id FROM users WHERE username = 'user'"
    ).fetchone()[0]

    board_exists = conn.execute(
        "SELECT 1 FROM boards WHERE user_id = ?", [user_id]
    ).fetchone()
    if not board_exists:
        conn.execute(
            "INSERT INTO boards (user_id, name, content) VALUES (?, ?, ?)",
            [user_id, "Main Board", json.dumps(_SEED_BOARD)],
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
