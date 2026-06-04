# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

A local Project Management app: multiple Kanban boards per user, drag-and-drop, inline card editing (priority, due date, labels), session-based auth with registration, SQLite persistence, and an OpenAI-powered AI sidebar. Runs locally without Docker.

## Commands

### Backend (run from `backend/`)

```powershell
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000  # start server
uv run pytest                                               # run all tests
uv run pytest tests/test_board.py                          # run a single test file
uv run pytest -k test_name                                  # run tests matching a name pattern
```

### Frontend (run from `frontend/`)

```powershell
npm run test:unit          # Vitest unit tests
npm run test:unit:watch    # Vitest in watch mode
npm run test:e2e           # Playwright e2e (builds first)
npm run test:all           # both unit and e2e
npm run build              # Next.js static export to frontend/out/
npm run dev                # local Next.js dev server (not served by FastAPI)
npm run lint               # ESLint
```

### Start/Stop Scripts (run from project root)

```powershell
.\scripts\start_windows.ps1   # start backend, writes PID to .server.pid
.\scripts\stop_windows.ps1    # stop backend using .server.pid
```

### Environment

Create a `.env` file at the project root with:
```
OPENAI_API_KEY=sk-...
```

## Architecture

```
project root/
  backend/        FastAPI app (Python, uv)
    pm.db         SQLite database (auto-created, git-ignored)
  frontend/       Next.js app (TypeScript, Tailwind)
    out/          static export — FastAPI serves this at /
  scripts/        start/stop scripts for Windows, macOS, Linux
  docs/           planning documents
  .env            OPENAI_API_KEY (git-ignored)
```

### Request Flow

All traffic goes through FastAPI on `http://127.0.0.1:8000`. The Next.js app is built to `frontend/out/` and served as static files at `/`. API routes live under `/api`. In dev mode (`npm run dev`), the frontend runs on a separate port and calls the backend directly.

### Backend Modules (`backend/app/`)

- `main.py` — FastAPI entry point; mounts routers; serves `frontend/out/` at `/`; `GET /api/health`
- `auth.py` — `/api/auth/login`, `/api/auth/logout`, `/api/auth/register`, `/api/auth/me`, `PATCH /api/auth/password`; `get_current_user` dependency; passwords hashed with PBKDF2-SHA256 (Python stdlib)
- `board.py` — multi-board CRUD routes (`GET/POST /api/boards`, `GET/PUT/PATCH/DELETE /api/boards/{id}`); `Card` and `BoardData` Pydantic models; `fetch_board_content` / `save_board_content` helpers used by `ai_router.py`
- `database.py` — SQLite init, schema, migration, `hash_password`/`verify_password`, seed data, `get_db()` dependency
- `ai.py` — OpenAI client, `gpt-4o-mini` model, Structured Outputs (`AIChatResponse`)
- `ai_router.py` — `POST /api/ai/chat`; reads board, calls `ai.chat()`, merges existing card metadata (priority, due_date, labels) into AI output, validates, saves if valid; caps history at 40 messages

### Frontend Modules (`frontend/src/`)

- `app/page.tsx` — root page; manages phases: `loading | unauthenticated | board-selection | board-loading | board-error | ready`
- `lib/api.ts` — all fetch calls: auth, board CRUD, AI chat
- `lib/kanban.ts` — `Card`, `Column`, `BoardData`, `Priority` types; `LABEL_OPTIONS`; `moveCard`, `createId`, `matchesFilter`
- `components/LoginForm.tsx` — toggles between sign-in and create-account modes
- `components/BoardSelector.tsx` — lists boards, inline create-board form
- `components/KanbanBoard.tsx` — owns board state; all mutations follow `prev → next → setBoard(next) → persist(prev, next)`; on failure rolls back to `prev`; AI updates skip `persist()` (backend already saved); holds filter state
- `components/KanbanColumn.tsx` — column rendering, rename, delete with confirmation, applies card filter
- `components/KanbanCard.tsx` — draggable card; view shows priority badge, due-date chip, label chips, checklist progress; edit has all fields including checklist items; state initialized on open (no useEffect sync)
- `components/KanbanCardPreview.tsx` — read-only card in `DragOverlay` while dragging
- `components/NewCardForm.tsx` — toggle-open add-card form used by `KanbanColumn`
- `components/AddColumnForm.tsx` — toggle-open tile for adding a new column
- `components/FilterBar.tsx` — search text, priority filter chips, overdue toggle
- `components/AISidebar.tsx` — chat history, input, send; passes `boardId` to `chatWithBoard`
- `components/BoardStats.tsx` — shows total cards, overdue count, checklist completion in board header
- `components/ArchivePanel.tsx` — collapsible panel listing archived cards; restore button per card
- `components/ChangePasswordModal.tsx` — modal for changing password; requires current password + new password (min 6 chars)

### Data Model

Board state stored as JSON in SQLite `boards.content`. Shape:

```typescript
type BoardData = {
  columns: { id: string; title: string; cardIds: string[] }[];
  cards: Record<string, {
    id: string; title: string; details: string;
    priority?: "low"|"medium"|"high"|"critical"|null;
    due_date?: string|null;
    labels?: string[];
    checklist?: { id: string; text: string; done: boolean }[];
    archived?: boolean;
  }>;
  description?: string;
  archivedCardIds?: string[];
}
```

`archived: true` cards are removed from column `cardIds` and listed in `archivedCardIds`. The archive panel shows them and lets users restore them.

The AI returns cards as a flat list (OpenAI Structured Outputs constraint). `ai_router.py` converts this to the dict shape, merges existing metadata (priority, due_date, labels, checklist), validates, and saves. Archived cards are not sent to the AI.

### Authentication

Starlette `SessionMiddleware` with a signed cookie. Session key defaults to `"dev-secret-change-in-production"` — override via `SESSION_SECRET_KEY` env var. Passwords stored as PBKDF2-SHA256 hashes; verified at login via `verify_password()` in `database.py`.

### CSS Theming

Use CSS custom properties from `globals.css`:

| Variable | Hex | Role |
|---|---|---|
| `--accent-yellow` | `#ecad0a` | Accent / highlights |
| `--primary-blue` | `#209dd7` | Primary actions, links |
| `--secondary-purple` | `#753991` | Secondary actions |
| `--navy-dark` | `#032147` | Headings, body text |
| `--gray-text` | `#888888` | Muted / secondary text |
| `--stroke` | — | Border color |
| `--surface` | `#f7f8fb` | Card / panel background |
| `--surface-strong` | `#ffffff` | Elevated surface |
| `--shadow` | — | Box-shadow shorthand |

Fonts: `Space_Grotesk` → `font-display` (headings), `Manrope` → body text.

### Backend Test Fixture Chain

```python
test_db          # tmp_path SQLite seeded via init_db()
client           # TestClient with get_db overridden to test_db
auth_client      # client pre-logged-in as "user" / "password"
default_board_id # ID of the seeded board (use this, not hardcoded 1)
```

Do not use `default_board_id` in unauthenticated tests — it triggers `auth_client` login and contaminates the session.

## Key Constraints

- No Docker. Local scripts only.
- `uv` for Python deps; `npm` for frontend.
- API key always server-side; never expose `OPENAI_API_KEY` in frontend code.
- All API routes under `/api`. Frontend served at `/`.
- Keep implementations simple. No features outside the current scope.
- Update `docs/PLAN.md` and `docs/ToDos.md` before starting implementation work.

## Coding Approach

- No emojis anywhere in the codebase or documentation.
- Identify root cause before fixing — prove with evidence, then fix. Do not guess.
- Never over-engineer. No unnecessary abstractions beyond what the task requires.
- Do not start implementation work until planning docs are updated.
