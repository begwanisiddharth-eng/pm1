# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

A local Project Management app: multiple Kanban boards per user, drag-and-drop columns and cards, rich inline card editing (priority, due date, labels, checklist, comments, color accent), WIP limits and column collapse, session-based auth with registration, SQLite persistence, and an OpenAI-powered AI sidebar. Runs locally without Docker.

## Commands

### Backend (run from `backend/`)

```powershell
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000  # start server
uv run pytest                                               # run all tests (101)
uv run pytest tests/test_board.py                          # run a single test file
uv run pytest -k test_name                                  # run tests matching a name pattern
```

### Frontend (run from `frontend/`)

```powershell
npm run test:unit          # Vitest unit tests (85)
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

Optional:
```
SESSION_SECRET_KEY=<random string>   # overrides the default dev secret
```

## Architecture

```
project root/
  backend/        FastAPI app (Python, uv)
    app/
      main.py       entry point
      auth.py       /api/auth/* routes
      board.py      /api/boards/* routes + Pydantic models
      ai.py         OpenAI client + AIChatResponse schema
      ai_router.py  POST /api/ai/chat
      database.py   SQLite init, schema, migrations, password hashing
    tests/
      test_auth.py
      test_board.py
      test_ai.py
    pm.db           SQLite database (auto-created, git-ignored)
  frontend/
    src/
      app/page.tsx          root page (phase state machine)
      lib/api.ts            all fetch calls
      lib/kanban.ts         types, constants, pure helpers
      components/           all UI components
    out/                    static export — FastAPI serves this at /
  scripts/          start/stop scripts for Windows, macOS, Linux
  docs/             planning documents
  .env              OPENAI_API_KEY (git-ignored)
```

### Request Flow

All traffic goes through FastAPI on `http://127.0.0.1:8000`. The Next.js app is built to `frontend/out/` and served as static files at `/`. API routes live under `/api`. In dev mode (`npm run dev`), the frontend runs on a separate port and calls the backend directly.

---

## Backend Modules (`backend/app/`)

### `main.py`

FastAPI entry point. Mounts the auth, board, and AI routers. Serves `frontend/out/` as static files at `/` using `StaticFiles`. Provides `GET /api/health` returning `{"status": "ok"}`. Reads `SESSION_SECRET_KEY` from the environment (falls back to `"dev-secret-change-in-production"`).

### `auth.py`

All routes under `/api/auth`. Pydantic request models: `LoginRequest`, `RegisterRequest`, `ChangePasswordRequest`.

**Critical implementation note**: `get_current_user(request: Request) -> str` is defined as a plain function before any route handler in this file. This matters because Python evaluates `Depends(get_current_user)` as a default argument at function-definition time — if `get_current_user` were defined after the routes that reference it, Python would raise a `NameError`.

Routes:
- `POST /api/auth/register` — validates username (min 3 chars), password (min 6 chars), checks for duplicate username (409), hashes password with PBKDF2-SHA256, inserts user, inserts a default empty board (To Do / In Progress / Done, no cards).
- `POST /api/auth/login` — looks up user by username, verifies password hash, sets `request.session["user"]`.
- `POST /api/auth/logout` — clears the session.
- `GET /api/auth/me` — returns `{"username": "..."}` or 401.
- `PATCH /api/auth/password` — verifies current password, enforces min 6 chars on new password, re-hashes and updates.

### `board.py`

All routes under `/api/boards`. Pydantic models used for request validation and response serialisation:

```python
class ChecklistItem(BaseModel):
    id: str
    text: str
    done: bool = False

class Comment(BaseModel):
    id: str
    text: str
    created_at: str          # ISO 8601 string

class Card(BaseModel):
    id: str
    title: str
    details: str
    priority: Literal["low", "medium", "high", "critical"] | None = None
    due_date: str | None = None
    labels: list[str] = []
    checklist: list[ChecklistItem] = []
    comments: list[Comment] = []
    color: str | None = None
    archived: bool = False

class Column(BaseModel):
    id: str
    title: str
    cardIds: list[str]
    wipLimit: int | None = None   # optional max card count
    collapsed: bool = False        # whether the column is shown as a slim strip

class BoardData(BaseModel):
    columns: list[Column]
    cards: dict[str, Card]
    description: str | None = None
    archivedCardIds: list[str] = []

    @model_validator(mode="after")
    def check_card_refs(self) -> "BoardData": ...
    # Enforces: every active card ID in column.cardIds exists in cards,
    # every card in cards is either active (in a column) or archived (in archivedCardIds),
    # every archivedCardId exists in cards.
```

Internal helpers:
- `_board_summary(db, board_id) -> BoardSummary` — re-queries the row and builds a `BoardSummary`; shared by `create_board` and `rename_board` to avoid duplication.

Helper functions used by `ai_router.py`:
- `fetch_board_content(db, board_id) -> str` — fetches the raw JSON string from `boards.content`.
- `save_board_content(db, board_id, content) -> bool` — updates `boards.content` and `boards.updated_at`; returns `True` if a row was updated.

Routes:
- `GET /api/boards` — list boards for the current user (id, name, updated_at), ordered by `updated_at DESC`.
- `POST /api/boards` (201) — create a board with name from `{"name": "..."}`.
- `GET /api/boards/{id}` — return full `BoardData` for one board (ownership checked).
- `PUT /api/boards/{id}` — replace board content with validated `BoardData` body; returns the validated body.
- `PATCH /api/boards/{id}/name` — rename the board.
- `DELETE /api/boards/{id}` (204) — delete the board; blocked if it is the user's only board (HTTP 400).

### `database.py`

- `DB_PATH` — `backend/pm.db` (relative to the module file).
- `hash_password(password) -> str` — `pbkdf2:sha256:100000:<hex-salt>:<hex-key>`. Salt is 16 random bytes.
- `verify_password(password, stored_hash) -> bool` — splits the stored hash on `:`, re-derives the key, compares.
- `init_db(path)` — creates `users` and `boards` tables if absent; runs two `ALTER TABLE` migrations for `password_hash` and `name` columns; seeds a default `user`/`password` account and board if absent.
- `get_db()` — FastAPI dependency generator; opens a `sqlite3.Row`-factory connection, yields it, closes on exit.
- `_EMPTY_BOARD` — dict used when creating boards via `POST /api/boards` or registration; has three empty columns.
- `_SEED_BOARD` — dict used for the default development user's board; has 8 sample cards across 5 columns.

### `ai.py`

- Initialises the OpenAI client from `OPENAI_API_KEY` environment variable.
- Defines `AIChatResponse` as a Pydantic model used with Structured Outputs (strict JSON schema).
- `chat(messages) -> AIChatResponse` — calls `gpt-4o-mini` with the provided message list and returns the parsed response.

### `ai_router.py`

`POST /api/ai/chat`. Request body: `{"message": str, "history": Message[], "board_id": int}`.

Flow:
1. Verify board ownership.
2. Load the full board from the database.
3. Build an AI-visible board dict that excludes archived cards.
4. Inject the board JSON into the system prompt alongside the AI's instructions.
5. Append up to the last 40 history messages, then the new user message.
6. Call `ai.chat(messages)`.
7. If the AI returned a `board`:
   a. Check for duplicate card IDs (raises `ValueError`).
   b. Merge existing card metadata (priority, due_date, labels, checklist, comments, color) onto AI-updated cards — the AI only changes titles, details, column membership.
   c. Re-add archived cards to the merged board dict.
   d. Validate with `BoardData.model_validate`.
   e. Save if valid; discard on any exception.
8. Return `{"message": str, "board": BoardData | null}`.

---

## Frontend Modules (`frontend/src/`)

### `app/page.tsx`

Root page component. Manages a `Phase` state machine:

```
"loading" → on mount, calls getMe() + listBoards()
"unauthenticated" → shows LoginForm
"board-selection" → shows BoardSelector (only when user has >1 board)
"board-loading" → calls getBoard(), shows spinner
"board-error" → shows error message
"ready" → shows KanbanBoard
```

Passes `initialUpdatedAt={activeBoard.updated_at}` to `KanbanBoard` so the "last updated" display is correct on first render.

### `lib/api.ts`

All network calls. Uses `fetch` with `credentials: "include"` to send the session cookie. Throws on non-2xx responses.

Functions:
- Auth: `login(username, password)`, `logout()`, `register(username, password)`, `getMe() -> {username} | null`, `changePassword(current, next)`
- Boards: `listBoards() -> BoardSummary[]`, `getBoard(id) -> BoardData`, `saveBoard(id, board)`, `createBoard(name) -> BoardSummary`, `renameBoard(id, name) -> BoardSummary`, `deleteBoard(id)`
- AI: `chatWithBoard(boardId, message, history) -> ChatResponse`

`BoardSummary` is defined here: `{ id: number; name: string; updated_at: string }`.

### `lib/kanban.ts`

Pure TypeScript types, constants, and helpers. No side effects.

**Types:**
- `Priority` — `"low" | "medium" | "high" | "critical"`
- `ChecklistItem` — `{ id: string; text: string; done: boolean }`
- `Comment` — `{ id: string; text: string; created_at: string }`
- `Card` — all card fields (see data model section below)
- `Column` — `{ id, title, cardIds, wipLimit?: number | null, collapsed?: boolean }`
- `BoardData` — `{ columns: Column[]; cards: Record<string, Card>; description?: string | null; archivedCardIds?: string[] }`
- `CardFilter` — `{ search: string; priority: Priority | null; overdueOnly: boolean }`

**Constants:**
- `LABEL_OPTIONS: LabelOption[]` — 6 label presets (bug, feature, frontend, backend, design, docs) each with an id, display text, and Tailwind color classes.
- `CARD_COLORS: { hex: string; label: string }[]` — 6 color presets (Red #ef4444, Orange #f97316, Yellow #eab308, Green #22c55e, Blue #3b82f6, Purple #8b5cf6).

**Helpers:**
- `matchesFilter(card, filter) -> boolean` — pure filter predicate; applies search, priority, and overdue conditions.
- `createId(prefix) -> string` — `<prefix>-<6-char random base-36><timestamp base-36>`.
- `timeAgo(isoString) -> string` — converts an ISO timestamp to "just now", "N minutes ago", "N hours ago", or "N days ago".
- `moveCard(columns, activeId, overId) -> Column[]` — handles same-column reorder and cross-column moves.
- `moveColumn(columns, activeId, overId) -> Column[]` — swaps column positions.

### `components/LoginForm.tsx`

Toggles between sign-in mode and create-account mode. Calls `login()` or `register()` from `api.ts`. Displays inline error messages. On success calls `onLogin(username)`.

### `components/BoardSelector.tsx`

Lists all boards with `timeAgo(board.updated_at)` timestamps. "Create board" inline form (toggle-open). Calls `createBoard(name)` on submit. Has a logout button. Passes selected board to `onSelect`.

### `components/KanbanBoard.tsx`

The root board component. Owns all board state and orchestrates every mutation.

**State:**
- `board: BoardData` — the authoritative in-memory board state.
- `activeCardId: string | null` — the card being dragged (for `DragOverlay`).
- `saveError: string | null` — displayed as a red banner when `persist` fails.
- `editingBoardName`, `boardNameDraft`, `currentBoardName` — inline board rename.
- `confirmDelete` — board delete confirmation.
- `filter: CardFilter` — shared filter state passed down to all columns.
- `editingDescription`, `descriptionDraft` — inline description edit.
- `showProfileMenu`, `showChangePassword` — profile dropdown and change-password modal.
- `lastUpdated: string | undefined` — ISO timestamp updated after every successful save; displayed as `timeAgo(lastUpdated)`.
- `confirmImport: BoardData | null` — parsed import data awaiting confirmation.
- `showShortcuts: boolean` — controls `ShortcutsModal` visibility.
- `importInputRef` — ref to the hidden `<input type="file">` for JSON import.

**Mutation pattern** (all handlers follow this):
```typescript
const prev = board;
const next: BoardData = { ...board, /* changes */ };
setBoard(next);
void persist(prev, next);
// persist: on success → setLastUpdated(new Date().toISOString())
//          on failure → setBoard(prev) + setSaveError(...)
```

**Local helpers:**
- `cardsForIds(ids: string[]) -> Card[]` — maps an array of card IDs to their `Card` objects from `board.cards`; used for both the column render and archive panel to avoid duplicating the `flatMap` lookup.

**Key handlers:**
- `handleRenameColumn(columnId, title)`
- `handleAddColumn(title)` — generates ID with `createId("col")`
- `handleDeleteColumn(columnId)` — also removes the column's cards from `board.cards`
- `handleAddCard(columnId, title, details)` — generates ID with `createId("card")`
- `handleArchiveCard(columnId, cardId)` — sets `archived: true`, removes from `cardIds`, adds to `archivedCardIds`
- `handleRestoreCard(cardId)` — reverses archive; always restores to the first column
- `handleDeleteArchivedCard(cardId)` — removes from `cards` and `archivedCardIds`
- `handleMoveCardToColumn(cardId, fromColumnId, toColumnId)` — moves to end of target column
- `handleDuplicateCard(columnId, cardId)` — copies card with new ID and `"Copy of "` prefix; inserts immediately after source
- `handleEditCard(cardId, title, details, priority, dueDate, labels, checklist, comments, color)` — all nine fields updated atomically
- `handleSetWipLimit(columnId, limit)` — sets `column.wipLimit` to `number | null`
- `handleToggleCollapse(columnId)` — toggles `column.collapsed`
- `handleImportFile(e)` — reads file, validates, sets `confirmImport`
- `handleConfirmImport()` — applies `confirmImport` and calls `persist`
- `handleExportJson()` — creates Blob from `JSON.stringify(board, null, 2)`, triggers download
- `handleAiBoardUpdate(aiBoard)` — calls `setBoard(aiBoard)` only (no `persist` — backend already saved)

**`?` key handler** (registered in `useEffect` on `window`):
```typescript
if (e.key === "?") {
  const target = e.target as HTMLElement;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
  setShowShortcuts(true);
}
```

### `components/KanbanColumn.tsx`

Rendered inside `@dnd-kit/sortable`'s `SortableContext`. Uses `useSortable({ id: column.id })`.

**Props:**
```typescript
{
  column: Column;
  cards: Card[];
  otherColumns: { id: string; title: string }[];
  filter?: CardFilter;
  onRename: (columnId, title) => void;
  onAddCard: (columnId, title, details) => void;
  onEditCard: (cardId, title, details, priority, dueDate, labels, checklist, comments, color) => void;
  onArchiveCard: (columnId, cardId) => void;
  onDuplicateCard: (columnId, cardId) => void;
  onMoveCardToColumn: (cardId, fromColumnId, toColumnId) => void;
  onDeleteColumn: (columnId) => void;
  onSetWipLimit: (columnId, limit: number | null) => void;
  onToggleCollapse: (columnId) => void;
}
```

**WIP limit logic:**
```typescript
const isAtLimit  = wipLimit !== null && cards.length === wipLimit;
const isOverLimit = wipLimit !== null && cards.length > wipLimit;
const isDisabledByWip = isAtLimit || isOverLimit;
// badge class: red when over, amber when at, grey otherwise
```

The WIP limit inline editor uses local state `editingWipLimit` and `wipDraft`. Enter/blur calls `commitWipLimit()` which parses the draft, calls `onSetWipLimit`, and hides the input. Clearing the input passes `null` (removes the limit).

**Collapsed rendering:** When `column.collapsed` is `true`, the component renders a narrow `w-12` strip with `writingMode: "vertical-rl"` and `transform: "rotate(180deg)"` on the title span, plus the card count badge. The entire strip has an `onClick` that calls `onToggleCollapse`. The full column body (cards, forms, delete button) is not rendered.

**`visibleCards`:** `filter ? cards.filter(c => matchesFilter(c, filter)) : cards` — used only for rendering; `cards.length` (the raw count) is always used for WIP limit calculations.

**`searchQuery`:** `filter?.search` is passed as `searchQuery` to each `KanbanCard`.

### `components/KanbanCard.tsx`

Uses `useSortable({ id: card.id })` for drag-and-drop.

**`HighlightText` component** (defined at the top of the file):
```typescript
const HighlightText = ({ text, query }: { text: string; query: string }) => {
  // finds first case-insensitive match, wraps in <mark className="bg-yellow-200 ...">
  // returns unmodified text if no match or empty query
};
```

**State initialisation:** `openEdit()` initialises all edit state directly from the current `card` prop. There is no `useEffect` that syncs edit state — this avoids stale-state bugs when the card is updated externally.

**Due-date chip logic** (`formatDueDate`):
- `diffDays < 0` → `overdue: true` — red chip "Overdue · date"; also red inset left box-shadow
- `diffDays >= 0 && diffDays <= 2` → `soon: true` — amber chip
- Otherwise — grey chip

**Color accent:** Applied as `style={{ borderTop: card.color ? \`3px solid ${card.color}\` : undefined }}` on the article element. Inline style is used because Tailwind's `border-l-*` and the existing `border` class on the card fight for specificity.

### `components/KanbanCardPreview.tsx`

A read-only snapshot of a card rendered in `DndContext`'s `DragOverlay` while a drag is in progress. Receives the `Card` object directly (no drag hooks).

### `components/NewCardForm.tsx`

Toggle-open add-card form at the bottom of each column.

Props: `{ onAdd: (title, details) => void; disabled?: boolean }`

When `disabled` is `true` (column is at or over WIP limit), the "Add a card" button is replaced by a `<p>Column at WIP limit</p>` message. The open form itself is not shown.

Escape closes and resets the form. Enter submits (via form `onSubmit`). The title input auto-focuses on open.

### `components/AddColumnForm.tsx`

Toggle-open tile for adding a new column; rendered after the last column in the column list. Escape closes, Enter submits. Auto-focuses the title input.

### `components/FilterBar.tsx`

Three controls: text search `<input>`, priority chip selector (four chips + clear chip), overdue-only toggle button. Calls `onChange(filter)` on every change. A "Clear" button resets all three fields at once.

### `components/AISidebar.tsx`

Chat history display, message input textarea (Enter sends, Shift+Enter inserts newline), Send button. A "Clear" button (shown only when `messages.length > 0`) calls `setMessages([])` to wipe local conversation history. Sends `boardId` and the current `messages` array as `history` to `chatWithBoard`.

### `components/BoardStats.tsx`

Read-only stat row displayed in the board header. Computes from the current `board` prop:
- Total active cards (not archived)
- Overdue card count (cards with `due_date` strictly before today)
- Checklist completion: `done / total` across all active cards

### `components/ArchivePanel.tsx`

Collapsible panel rendered below the column grid when `archivedCardIds.length > 0`. Lists archived cards by title. Each entry has "Restore" and "Delete" buttons. "Delete" requires a second click (confirmation inline).

### `components/ChangePasswordModal.tsx`

Fixed overlay modal. Fields: current password, new password, confirm new password. Client-side validation: passwords must match; new password min 6 chars. On submit, calls `changePassword()` from `api.ts`. On success, shows a brief success message then auto-closes after 1.5 seconds. On API error, shows the error message inline. Escape closes.

### `components/ShortcutsModal.tsx`

Fixed overlay modal. Renders a three-column table (Context / Key / Action) of 13 keyboard shortcut rows. The `<kbd>` element styles each key.

- Backdrop `div` has `onClick={onClose}`.
- Inner panel `div` has `onClick={e => e.stopPropagation()}` to prevent backdrop close when clicking inside.
- `useEffect` registers a `keydown` listener on `window`; Escape calls `onClose`.
- Close button (`aria-label="Close shortcuts modal"`) in the header.

---

## Data Model

Board state stored as JSON in the SQLite `boards.content` column. The complete TypeScript shape:

```typescript
type BoardData = {
  columns: {
    id: string;
    title: string;
    cardIds: string[];          // ordered list of active card IDs in this column
    wipLimit?: number | null;   // optional max card count; null means no limit
    collapsed?: boolean;        // true = render as slim vertical strip
  }[];
  cards: Record<string, {
    id: string;
    title: string;
    details: string;
    priority?: "low" | "medium" | "high" | "critical" | null;
    due_date?: string | null;   // YYYY-MM-DD
    labels?: string[];          // label IDs from LABEL_OPTIONS
    checklist?: { id: string; text: string; done: boolean }[];
    comments?: { id: string; text: string; created_at: string }[];  // created_at is ISO 8601
    color?: string | null;      // hex color string or null
    archived?: boolean;
  }>;
  description?: string | null;
  archivedCardIds?: string[];   // IDs of archived cards; those cards remain in `cards`
};
```

**Invariant enforced by `BoardData.model_validator`:** the set of IDs in all `column.cardIds` must equal exactly the set of card IDs in `cards` minus those in `archivedCardIds`. Every ID in `archivedCardIds` must exist in `cards`.

---

## Authentication

Starlette `SessionMiddleware` with a signed cookie (`itsdangerous` under the hood). Session key read from `SESSION_SECRET_KEY` env var; defaults to `"dev-secret-change-in-production"` — must be changed in any deployment. Passwords stored as PBKDF2-SHA256 hashes; verified at login via `verify_password()` in `database.py`.

---

## CSS Theming

Use CSS custom properties defined in `globals.css`:

| Variable | Hex | Role |
|---|---|---|
| `--accent-yellow` | `#ecad0a` | Accent / highlights (drag handles, active states) |
| `--primary-blue` | `#209dd7` | Primary actions, links, focus rings |
| `--secondary-purple` | `#753991` | Secondary actions (add card button) |
| `--navy-dark` | `#032147` | Headings, body text |
| `--gray-text` | `#888888` | Muted / secondary text |
| `--stroke` | — | Border color |
| `--surface` | `#f7f8fb` | Card / panel background |
| `--surface-strong` | `#ffffff` | Elevated surface (column background) |
| `--shadow` | — | Box-shadow shorthand |

Fonts: `Space_Grotesk` loaded as `font-display` (headings, board title), `Manrope` as the default body font.

---

## Backend Test Fixture Chain

```python
test_db          # tmp_path SQLite — fresh DB, seeded via init_db()
client           # TestClient with get_db overridden to test_db
auth_client      # client pre-logged-in as "user" / "password"
default_board_id # ID of the seeded board (query from the DB — do not hardcode 1)
```

**Important:** do not use `default_board_id` in unauthenticated tests. The fixture transitively depends on `auth_client`, which performs a login and sets session state. Using it in a test that also tests unauthenticated behavior will contaminate the session.

---

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
