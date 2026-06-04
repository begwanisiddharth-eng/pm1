# The Project Management App

## Business Requirements

This project is a local Project Management App. Implemented features:

- Users can register an account or sign in to an existing one.
- Authenticated users see a board selector showing all their Kanban boards.
- Each user can have multiple Kanban boards; they can create, rename, and delete boards.
- On a board: columns can be added, renamed, deleted; cards can be dragged between and within columns.
- Columns can be reordered by drag-and-drop.
- Cards carry optional metadata: priority (low/medium/high/critical), due date, labels, and a checklist.
- Cards can be moved with drag and drop, edited inline (all fields), created, and deleted.
- A filter bar lets users search cards by text, filter by priority, and show overdue-only.
- Board header shows live summary stats: total cards, overdue count, checklist completion.
- There is an AI chat sidebar; the AI can create, edit, move, and reorganize cards and columns.
  The AI preserves card metadata (priority, due_date, labels, checklist) when updating the board.
- Cards can be archived (soft-deleted); an archive panel lets users view and restore archived cards.
- Users can set a board description; it appears beneath the board title.

## Technical Decisions

- NextJS 16 frontend (TypeScript, Tailwind CSS, `@dnd-kit`)
- Python FastAPI backend served with `uv`; serves the static NextJS export at `/`
- SQLite database (`backend/pm.db`), auto-created and migrated on startup
- Session auth via Starlette `SessionMiddleware`; passwords hashed with PBKDF2-SHA256 (stdlib)
- OpenAI `gpt-4o-mini` with Structured Outputs for AI board updates
- Read `OPENAI_API_KEY` from `.env` in the project root
- No Docker; local scripts only (`scripts/`)
- `uv` for Python dependency management, `npm` for frontend

## Constraints

- Run locally without Docker or container infrastructure.
- API key stays server-side only; never expose in frontend code.
- All API routes under `/api`; frontend served at `/`.
- No features outside the current scope unless explicitly requested.

## Color Scheme

- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991`
- Dark Navy: `#032147`
- Gray Text: `#888888`

## Coding Standards

1. Use latest idiomatic approaches. Keep it simple — never over-engineer.
2. No unnecessary defensive programming, no extra features beyond the task.
3. No emojis anywhere in code or docs.
4. When hitting issues, prove the root cause with evidence before fixing.
5. Update `docs/PLAN.md` and `docs/ToDos.md` before implementation work.

## Working Documentation

Planning and task tracking live in `docs/`. Review `docs/PLAN.md` and `docs/ToDos.md`
before starting implementation. See `CLAUDE.md` for architecture details and commands.
