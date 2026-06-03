# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

A local Project Management MVP: a Kanban board with drag-and-drop, inline card editing, session-based auth, SQLite persistence, and an OpenAI-powered AI sidebar. Runs locally without Docker. One hardcoded account (`user` / `password`), one board per user.

## Commands

### Backend (run from `backend/`)

```powershell
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000  # start server
uv run pytest                                               # run all tests
uv run pytest tests/test_board.py                          # run a single test file
```

### Frontend (run from `frontend/`)

```powershell
npm run test:unit          # Vitest unit tests
npm run test:unit:watch    # Vitest in watch mode
npm run test:e2e           # Playwright e2e (builds first)
npm run test:all           # both unit and e2e
npm run build              # Next.js static export to frontend/out/
npm run dev                # local Next.js dev server (not served by FastAPI)
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
  frontend/       Next.js app (TypeScript, Tailwind)
    out/          static export — FastAPI serves this at /
  scripts/        start/stop scripts for Windows, macOS, Linux
  docs/           planning documents
  .env            OPENAI_API_KEY (git-ignored)
  pm.db           SQLite database (auto-created, git-ignored)
```

### Request Flow

All traffic goes through FastAPI on `http://127.0.0.1:8000`. The Next.js app is built to `frontend/out/` and served as static files at `/`. API routes live under `/api`. In dev mode (`npm run dev`), the frontend runs on a separate port and calls the backend directly.

### Backend Modules (`backend/app/`)

- `main.py` — FastAPI app entry point; mounts routers and serves `frontend/out/` at `/`
- `auth.py` — `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`; `get_current_user` dependency used by protected routes
- `board.py` — `GET /api/board`, `PUT /api/board`; `BoardData` Pydantic model shared with ai_router
- `database.py` — SQLite init, `users`/`boards` tables, seed data, `get_db()` dependency
- `ai.py` — OpenAI client, `gpt-4o-mini` model, Structured Outputs (`AIChatResponse`)
- `ai_router.py` — `POST /api/ai/chat`; reads board, calls `ai.chat()`, validates AI board output, saves if valid

### Frontend Modules (`frontend/src/`)

- `app/page.tsx` — root page; manages auth phase (`loading | unauthenticated | board-error | ready`)
- `lib/api.ts` — all fetch calls (`getMe`, `login`, `logout`, `getBoard`, `saveBoard`, `chatWithBoard`)
- `lib/kanban.ts` — `Card`, `Column`, `BoardData` types; default data; ID helpers; move helpers
- `components/KanbanBoard.tsx` — owns board state; calls `saveBoard` after every change
- `components/KanbanColumn.tsx` — column rendering, inline title editing, add card
- `components/KanbanCard.tsx` — draggable card, delete, inline edit form (title + details)
- `components/AISidebar.tsx` — chat history, input, send; calls `chatWithBoard`; applies board updates
- `components/LoginForm.tsx` — login UI

### Data Model

Board state stored as JSON in SQLite `boards.content`. Shape:

```typescript
type BoardData = {
  columns: { id: string; title: string; cardIds: string[] }[];
  cards: Record<string, { id: string; title: string; details: string }>;
}
```

The AI returns cards as a flat list (OpenAI schema constraint); `ai_router.py` converts to dict before saving.

### Authentication

Starlette `SessionMiddleware` with a signed cookie. `get_current_user` is a FastAPI dependency injected into protected routes. Session key defaults to `"dev-secret-change-in-production"` — override via `SESSION_SECRET_KEY` env var.

## Key Constraints

- No Docker. Local scripts only.
- `uv` for Python deps; `npm` for frontend.
- API key is always server-side; never expose `OPENAI_API_KEY` to frontend code.
- All API routes under `/api`. Frontend served at `/`.
- Keep implementations simple. No features outside the MVP scope.
- Update `docs/PLAN.md` and `docs/ToDos.md` before starting implementation work.
- Color scheme: accent yellow `#ecad0a`, blue `#209dd7`, purple `#753991`, dark navy `#032147`, gray `#888888`.
