# Database Design

## Overview

SQLite, stored at `backend/pm.db`. Created automatically on first server start if the file does not exist. The file is not committed to git.

## Schema

```sql
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
```

### users

| Column     | Type    | Notes                        |
|------------|---------|------------------------------|
| id         | INTEGER | Primary key, autoincrement   |
| username   | TEXT    | Unique, not null             |
| created_at | TEXT    | ISO-8601 UTC timestamp       |

No password column for the MVP — authentication is hardcoded in the application. A future migration can add `password_hash` when real registration is built.

### boards

| Column     | Type    | Notes                                  |
|------------|---------|----------------------------------------|
| id         | INTEGER | Primary key, autoincrement             |
| user_id    | INTEGER | Foreign key → users.id                 |
| content    | TEXT    | Full board state as a JSON string      |
| updated_at | TEXT    | ISO-8601 UTC timestamp, updated on PUT |

One row per user for the MVP. The schema naturally supports multiple boards per user in the future by querying on `user_id`.

## Board JSON shape

The `content` column stores the frontend `BoardData` type verbatim:

```json
{
  "columns": [
    { "id": "col-backlog",   "title": "Backlog",      "cardIds": ["card-1", "card-2"] },
    { "id": "col-discovery", "title": "Discovery",    "cardIds": ["card-3"] },
    { "id": "col-progress",  "title": "In Progress",  "cardIds": ["card-4", "card-5"] },
    { "id": "col-review",    "title": "Review",       "cardIds": ["card-6"] },
    { "id": "col-done",      "title": "Done",         "cardIds": ["card-7", "card-8"] }
  ],
  "cards": {
    "card-1": { "id": "card-1", "title": "Align roadmap themes",    "details": "Draft quarterly themes with impact statements and metrics." },
    "card-2": { "id": "card-2", "title": "Gather customer signals", "details": "Review support tags, sales notes, and churn feedback." },
    "card-3": { "id": "card-3", "title": "Prototype analytics view","details": "Sketch initial dashboard layout and key drill-downs." },
    "card-4": { "id": "card-4", "title": "Refine status language",  "details": "Standardize column labels and tone across the board." },
    "card-5": { "id": "card-5", "title": "Design card layout",      "details": "Add hierarchy and spacing for scanning dense lists." },
    "card-6": { "id": "card-6", "title": "QA micro-interactions",   "details": "Verify hover, focus, and loading states." },
    "card-7": { "id": "card-7", "title": "Ship marketing page",     "details": "Final copy approved and asset pack delivered." },
    "card-8": { "id": "card-8", "title": "Close onboarding sprint", "details": "Document release notes and share internally." }
  }
}
```

This is identical to the `initialData` constant in `frontend/src/lib/kanban.ts`. No transformation is needed between the frontend and the database.

## Seed data

On first startup, if the `users` or `boards` rows are missing, the backend inserts:

1. A row in `users` with `username = "user"`.
2. A row in `boards` for that user containing the default board JSON above.

Seeding is idempotent: it checks for existence before inserting.

## Access patterns

| Operation        | SQL                                                    |
|------------------|--------------------------------------------------------|
| Read board       | `SELECT content FROM boards WHERE user_id = ?`         |
| Update board     | `UPDATE boards SET content = ?, updated_at = ? WHERE user_id = ?` |
| Lookup user      | `SELECT id FROM users WHERE username = ?`              |

## File location

`backend/pm.db` — listed in `.gitignore`, never committed.
