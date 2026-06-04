# The Project Management App

## Business Requirements

This project is a local Project Management App. All features listed below are fully implemented.

### Authentication and User Management

- Users can register a new account (username + password, min lengths enforced).
- Users can sign in with an existing account; invalid credentials fail clearly.
- Authenticated users are kept in a signed session cookie; the session survives page reload.
- Users can sign out from the profile dropdown in the board header.
- Users can change their password from the profile dropdown without logging out; the current password is verified and a minimum length of 6 characters is enforced on the new password.

### Board Management

- Each user can have multiple named Kanban boards.
- On first registration a default "My Board" is created automatically.
- A board selector screen lists all boards with human-readable last-updated timestamps (e.g. "3 hours ago").
- Users can create new boards, rename boards inline, and delete boards (deletion blocked when it is the user's only board).
- Each board has an optional description editable inline below the board title.
- The board header shows a live stats row: total card count, overdue card count, and checklist completion ratio.
- Boards can be exported to a JSON file and imported from a JSON file (import requires confirmation before overwriting).
- The board header shows a human-readable "last updated" timestamp refreshed after every save.

### Column Management

- Columns can be added, renamed inline, and deleted (with confirmation and card-count warning).
- Columns can be reordered by drag-and-drop using the yellow pill drag handle.
- Each column header shows a card count badge.
- Empty columns (zero cards) show an inviting empty-state prompt rather than blank space.
- Columns can have a WIP (work-in-progress) limit — a maximum card count set by the user. When the visible card count meets or exceeds the limit the column header turns orange; when it exceeds the limit it turns red.
- Columns can be collapsed to a slim vertical strip to reclaim horizontal space; clicking the strip expands them again.

### Card Management

- Cards can be created, edited inline (all fields), duplicated (copy button creates "Copy of …" immediately after the original), archived (soft-deleted), and permanently deleted from the archive.
- Cards support drag-and-drop reordering within and between columns.
- A "Move to…" dropdown lets users move a card to any other column without dragging.
- Cards carry optional metadata: priority (low / medium / high / critical), due date, labels (multi-select from 6 predefined options), checklist (ordered sub-items with done/undone state), timestamped comments, and an accent color (6 preset swatches + None).
- View mode shows: accent color top border strip, priority badge, due-date chip, label chips, checklist progress chip (e.g. "2 / 4"), comment count chip, and action buttons (Edit, Copy, Move, Archive).
- Overdue cards are highlighted with a red inset left border and a red due-date chip reading "Overdue · date".
- Cards due today or within 2 days show an amber due-date chip.

### Filtering

- A filter bar lets users search cards by text (with live highlight of matching substrings in card titles and details), filter by priority (chip selector), and toggle overdue-only view.
- A clear button resets all filters. Active filter counts are visible.
- Filtered columns still show a "No cards match filter" placeholder when all cards are hidden.

### Archive

- Archived cards are removed from their column's card list and collected in `archivedCardIds`.
- An archive panel (collapsible) appears below the board when there are archived cards; each entry has Restore and Delete buttons.
- Archived cards are hidden from the AI and not sent in the board JSON to OpenAI.

### AI Assistant

- An AI chat sidebar (powered by OpenAI `gpt-4o-mini` with Structured Outputs) lets users ask the AI to create, edit, move, rename, or reorganize cards and columns in natural language.
- The AI preserves all card metadata (priority, due_date, labels, checklist, comments, color) when updating the board.
- Conversation history is maintained across messages (capped at 40 messages) and can be cleared with a "Clear" button.
- The backend validates the AI's proposed board before saving; invalid output is silently discarded and the existing board is preserved.

### Keyboard Shortcuts

- Escape: cancels any open edit form or dismisses an open modal without saving.
- Enter: saves single-field inline forms (column rename, board name, new card title, new column title, board description).
- Shift+Enter in the AI chat textarea: inserts a newline.
- `?` key (or help button): opens the keyboard shortcut reference modal.

## Technical Decisions

- Next.js 16 frontend (TypeScript, Tailwind CSS, `@dnd-kit/core` + `@dnd-kit/sortable`)
- Python FastAPI backend served with `uv`; serves the static Next.js export at `/`
- SQLite database (`backend/pm.db`), auto-created and migrated on startup
- Session auth via Starlette `SessionMiddleware`; passwords hashed with PBKDF2-SHA256 (Python stdlib)
- OpenAI `gpt-4o-mini` with Structured Outputs for AI board updates
- `OPENAI_API_KEY` read from `.env` at the project root; never exposed to the frontend
- No Docker; local scripts only (`scripts/`)
- `uv` for Python dependency management, `npm` for frontend

## Constraints

- Run locally without Docker or container infrastructure.
- API key stays server-side only; never expose in frontend code.
- All API routes under `/api`; frontend served at `/`.
- No features outside the current scope unless explicitly requested.
- No emojis anywhere in code or docs.

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
