# Backend Instructions

## Current Shape

The backend is a local FastAPI app managed with `uv`.

### Key files (`backend/app/`)

- `main.py` — app entry point; mounts routers; serves `frontend/out/` at `/`; `GET /api/health`
- `auth.py` — `/api/auth/login`, `/api/auth/logout`, `/api/auth/register`, `/api/auth/me`;
  `get_current_user` dependency used by protected routes;
  passwords verified against PBKDF2-SHA256 hashes stored in the DB
- `database.py` — SQLite init, schema, PBKDF2 hash helpers, migration for older DBs,
  seed data; `get_db()` dependency; `_SEED_BOARD` and `_EMPTY_BOARD` constants
- `board.py` — multi-board CRUD routes; `Card` and `BoardData` Pydantic models;
  `fetch_board_content` / `save_board_content` helpers used by `ai_router.py`
- `ai.py` — OpenAI client, `gpt-4o-mini`, Structured Outputs (`AIChatResponse`)
- `ai_router.py` — `POST /api/ai/chat`; reads board, calls `ai.chat()`,
  merges existing card metadata (priority, due_date, labels) into AI output,
  validates, saves if valid; caps conversation history at 40 messages

### API routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/login` | No | Sign in |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/logout` | Yes | Sign out |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/boards` | Yes | List user boards |
| POST | `/api/boards` | Yes | Create board |
| GET | `/api/boards/{id}` | Yes | Get board content |
| PUT | `/api/boards/{id}` | Yes | Update board content |
| PATCH | `/api/boards/{id}/name` | Yes | Rename board |
| DELETE | `/api/boards/{id}` | Yes | Delete board (blocked if only board) |
| POST | `/api/ai/chat` | Yes | AI chat with board update |

### Card model

```python
class Card(BaseModel):
    id: str
    title: str
    details: str
    priority: Literal["low", "medium", "high", "critical"] | None = None
    due_date: str | None = None          # "YYYY-MM-DD"
    labels: list[str] = []               # predefined label names
```

### Database schema

```sql
users  (id, username UNIQUE, password_hash, created_at)
boards (id, user_id → users.id, name, content JSON, updated_at)
```

`init_db()` runs on startup; migrates older DBs (adds missing columns) before seeding.

## Commands

Run from `backend/`:

```powershell
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000   # start server
uv run pytest                                                # all tests
uv run pytest tests/test_board.py                           # single file
uv run pytest -k test_name                                  # name pattern
```

## Test Fixture Chain

```python
test_db          # tmp_path SQLite, seeded via init_db()
client           # TestClient with get_db overridden to test_db
auth_client      # client pre-logged-in as "user" / "password"
default_board_id # ID of the seeded board for "user"
```

## Implementation Notes

- Do not use Docker.
- Keep API routes under `/api`; serve frontend at `/`.
- Keep OpenAI API key server-side only.
- Always enforce board ownership: verify `board.user_id == current_user.id`.
- Use the `default_board_id` fixture (not a hardcoded `1`) in authenticated tests.
- Do not use `default_board_id` in unauthenticated tests (it would contaminate the session).
