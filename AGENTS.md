# The Project Management App

## Purpose

A local, single-server Project Management application built with FastAPI (Python) on the backend and Next.js (TypeScript) on the frontend. The frontend is compiled to a static export served by the same FastAPI process. There is no Docker, no external database server, and no separate frontend server in production — everything runs on `http://127.0.0.1:8000`.

---

## Implemented Features

All features listed below are fully implemented, tested, and committed to `main`.

### Authentication and User Management

- **Registration**: `POST /api/auth/register`. Username must be at least 3 characters; password at least 6. Duplicate usernames return HTTP 409. On success, a default board ("My Board") is created automatically for the new user and populated with three empty columns (To Do, In Progress, Done).
- **Login**: `POST /api/auth/login`. Invalid credentials return HTTP 401 with the message "Invalid credentials". A session cookie is set via Starlette `SessionMiddleware`.
- **Session persistence**: The signed session cookie keeps users authenticated across page reloads. The `get_current_user` FastAPI dependency reads `request.session["user"]`; it must be defined before route handlers (Python evaluates `Depends(...)` as a default argument at function-definition time).
- **Logout**: `POST /api/auth/logout` clears the session.
- **Current user**: `GET /api/auth/me` returns `{"username": "..."}` or 401.
- **Change password**: `PATCH /api/auth/password`. Verifies the current password, requires the new password to be at least 6 characters, and re-hashes with PBKDF2-SHA256. The modal on the frontend auto-closes on success and stays open with an inline error on failure.

Passwords are stored as `pbkdf2:sha256:100000:<hex-salt>:<hex-key>` using Python's `hashlib.pbkdf2_hmac`. The session secret defaults to `"dev-secret-change-in-production"` and should be overridden via the `SESSION_SECRET_KEY` environment variable.

---

### Board Management

- **Multiple boards per user**: Each user can have any number of named boards. A board selector screen is shown when a user has more than one board; if they have exactly one, it loads directly.
- **Board CRUD**:
  - `GET /api/boards` — list all boards for the current user, ordered by most recently updated, each with `id`, `name`, `updated_at`.
  - `POST /api/boards` — create a board with a given `name`; body must be `{"name": "..."}`. Returns 201 with the new `BoardSummary`.
  - `GET /api/boards/{id}` — retrieve the full board JSON (`BoardData`).
  - `PUT /api/boards/{id}` — replace the full board content with a validated `BoardData`; updates `updated_at`.
  - `PATCH /api/boards/{id}/name` — rename the board.
  - `DELETE /api/boards/{id}` — delete the board; blocked (HTTP 400) if it is the user's only board.

`POST /api/boards` and `PATCH /api/boards/{id}/name` both return a `BoardSummary` built by the shared internal helper `_board_summary(db, board_id)`, which re-queries the row after the write.
- **Board description**: An optional plain-text description stored in `BoardData.description`. Edited inline below the board title (click to edit, Enter saves, Escape cancels).
- **Last-updated timestamp**: The board header shows a human-readable relative timestamp (e.g. "3 minutes ago", "2 days ago") using the `timeAgo()` utility. The timestamp updates optimistically after every successful save.
- **Board selector timestamps**: The board selector list also uses `timeAgo()` for each board's `updated_at`.
- **Export to JSON**: A button in the board header serialises the current in-memory board state (full `BoardData`) as a pretty-printed JSON file and triggers a browser download named `<board-name>-board.json`.
- **Import from JSON**: A button opens a hidden file input; the selected file is read with `FileReader`, parsed, and validated (must have `columns: array` and `cards: object`). A confirmation modal ("Replace board?") is shown before the import is committed and persisted.
- **Stats row**: `BoardStats` component in the header shows total active card count, overdue card count, and checklist item completion (done / total) in real time from the current in-memory board state.

---

### Column Management

- **Add column**: An `AddColumnForm` tile at the end of the column list; toggle-open, Enter submits, Escape cancels. A new column gets a generated ID and an empty `cardIds` array.
- **Rename column**: The column title is an `<input>` that commits on blur or Enter, cancels on empty. The value is synced from `column.title` via `useEffect` to handle external updates (e.g. AI board updates).
- **Delete column**: Trash button opens an inline confirmation banner. The confirmation shows how many cards will be deleted, or "Delete this empty column?" for empty columns. Deletion removes the column from the board and purges all its card entries from `board.cards`.
- **Drag-and-drop reordering**: Columns are wrapped in `@dnd-kit/sortable`'s `SortableContext` with `horizontalListSortingStrategy`. A yellow pill handle (`div` with drag listeners) initiates the drag. Column moves are distinguished from card moves in `handleDragEnd` by checking whether both `active.id` and `over.id` appear in the `columnIds` array.
- **Card count badge**: Each column header shows a pill badge with the total card count for that column. The badge colour changes based on the WIP limit state (see below).
- **Empty-state prompt**: When a column has zero cards and is not in delete-confirm mode, the card area shows "No cards yet" with "Add one using the form below." in place of blank space.
- **Filter placeholder**: When a filter is active and hides all cards in a column that has cards, the card area shows "No cards match filter".

#### WIP Limits

- Users can set a maximum card count (work-in-progress limit) on any column. A "Set limit" button in the column header opens an inline `<input type="number">` (min 1). Enter or blur commits the value; Escape cancels. Clearing the input removes the limit (sets to `null`).
- The card count badge reflects the limit state:
  - No limit, or card count below the limit: default grey styling.
  - Card count equals the limit: amber styling (`bg-orange-50 text-orange-600`).
  - Card count exceeds the limit: red styling (`bg-red-50 text-red-600`).
- When the column is at or over its WIP limit, the "Add a card" button in `NewCardForm` is replaced by the message "Column at WIP limit", preventing new cards from being added.
- `wipLimit` is stored as an integer or `null` on each `Column` in the board JSON. It is accepted and returned by `PUT /api/boards/{id}` via the `Column` Pydantic model.

#### Column Collapse

- A collapse button (horizontal-lines icon) in the column header collapses the column to a slim vertical strip (`w-12`). The strip shows the column title rotated 90 degrees and the card count badge. Clicking anywhere on the strip expands it.
- Collapsed columns remain valid drag-and-drop targets and can be dragged to reorder.
- `collapsed` is stored as a boolean on each `Column` in the board JSON. It defaults to `false`.

---

### Card Management

Cards are stored as a flat `Record<string, Card>` dict in the board JSON (keyed by card ID). Each column holds an ordered `cardIds: string[]` array that references cards in the dict. The Pydantic `BoardData` validator enforces referential integrity: every card ID in a column's `cardIds` must exist in `cards`, and every card in `cards` must be referenced by exactly one column (or listed in `archivedCardIds`).

#### Card Fields

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Generated with `createId("card")` — prefix + random base-36 + timestamp base-36 |
| `title` | `string` | Required; validated non-empty on save |
| `details` | `string` | Free text; defaults to "No details yet." when created via `NewCardForm` |
| `priority` | `"low" \| "medium" \| "high" \| "critical" \| null` | Optional; `null` means unset |
| `due_date` | `string \| null` | ISO date string (YYYY-MM-DD) |
| `labels` | `string[]` | Zero or more label IDs from `LABEL_OPTIONS` (bug, feature, frontend, backend, design, docs) |
| `checklist` | `{ id, text, done }[]` | Ordered list; item IDs generated with `createId("chk")` |
| `comments` | `{ id, text, created_at }[]` | Timestamped; `created_at` is ISO 8601; item IDs generated with `createId("cmt")` |
| `color` | `string \| null` | Hex color from `CARD_COLORS` (6 presets) or `null` |
| `archived` | `boolean` | `true` removes the card from its column and adds it to `archivedCardIds` |

#### Card View Mode

The card article element has `borderTop` set inline to `3px solid <color>` when `card.color` is set (using an inline style rather than a Tailwind class to avoid specificity conflicts). View mode shows:
- Accent color strip (top border)
- `HighlightText`-wrapped title and details (highlights search matches with `<mark className="bg-yellow-200">`)
- Priority badge (colour-coded pill)
- Due-date chip: overdue cards show "Overdue · date" in red; cards due today or within 2 days show the date in amber; future cards show the date in grey
- Overdue cards also have a red inset left border applied via CSS `box-shadow: inset 3px 0 0 <red>` (not `border-l-*` to avoid the `border` shorthand specificity conflict with Tailwind)
- Label chips
- Checklist progress chip (e.g. "2 / 4 done")
- Comment count chip
- Action buttons: Edit, Copy (duplicate), Move (dropdown), Archive

#### Card Edit Mode

State is initialised from the card when the edit panel opens (`openEdit()`) — there is no `useEffect` sync, so stale state cannot accumulate. Fields:
- Title input (required; validates non-empty on save)
- Details textarea
- Priority selector (four buttons)
- Due date input (`<input type="date">`)
- Label multi-select (toggle chips for each of the 6 label options)
- Checklist: list of items each with a done checkbox and a remove button; new item input with Add button
- Comments: list of timestamped comments (read-only display); new comment textarea with Add button; comment IDs are generated client-side
- Color picker: circle swatch buttons for 6 preset hex colors plus a "No color" button

#### Card Operations

- **Create**: `NewCardForm` (toggle-open, Enter submits, Escape closes). Generates a new card ID and appends it to the column's `cardIds`.
- **Edit**: Opens the edit panel; saves by calling `onEdit` with all nine fields.
- **Duplicate**: "Copy" button creates a copy of the card with a new ID and title `"Copy of <original title>"`, inserted immediately after the source card in the same column. `archived` is explicitly set to `false` on the copy.
- **Move**: Dropdown lists all other columns. Selecting a column moves the card to the end of the target column's `cardIds` without reloading.
- **Archive (soft delete)**: Removes card ID from column `cardIds`, sets `card.archived = true`, appends to `board.archivedCardIds`. Card data remains in `board.cards`.
- **Drag-and-drop**: Cards use `@dnd-kit/sortable`'s `useSortable` hook. Moving within a column reorders `cardIds`; moving to another column removes from source and inserts at the drop position in the destination. `KanbanCardPreview` renders in the `DragOverlay` during a drag.

---

### Filtering

The `FilterBar` component exposes three filter controls:
- **Text search**: filters cards by substring match (case-insensitive) on `title` or `details`. Matching substrings are highlighted in card view mode using the `HighlightText` component.
- **Priority filter**: chip selector for one of the four priority values. Only cards with the selected priority are shown.
- **Overdue toggle**: shows only cards with a `due_date` that is strictly before today.

Filters are combined (all active conditions must match). A "Clear" button resets all three. A column whose cards are all hidden by an active filter shows "No cards match filter" in place of the card list.

`matchesFilter(card, filter)` is a pure function in `lib/kanban.ts`; it is used by `KanbanColumn` to compute `visibleCards`.

---

### Archive

- Archived cards are excluded from the active `cardIds` of every column and collected in `board.archivedCardIds`.
- The `ArchivePanel` component appears below the column grid when `archivedCardIds.length > 0`. It is collapsed by default. Each entry shows the card title with Restore and Delete (permanent) buttons.
- **Restore**: moves the card back to the first column's `cardIds`, sets `archived: false`, removes from `archivedCardIds`.
- **Permanent delete**: removes the card from `board.cards` and `archivedCardIds` entirely.
- Archived cards are excluded from the board JSON sent to the AI.

---

### AI Assistant

- A collapsible sidebar (`AISidebar`) on the right side of the board provides a chat interface powered by `POST /api/ai/chat`.
- Users type a message; Enter sends, Shift+Enter inserts a newline. A "Send" button is also provided.
- **Conversation history**: sent with each request as `history: Message[]` (role + content), capped to the last 40 messages on the backend.
- **Clear button**: appears when there are messages; clicking calls `setMessages([])` to reset the conversation locally.
- **Board context**: the backend reads the full current board from the database, strips archived cards, serialises the remaining board JSON, and injects it into the system prompt.
- **Structured Outputs**: the AI is called with `gpt-4o-mini` via the OpenAI Responses API using a strict JSON schema (`AIChatResponse`). The response has a `message: str` and an optional `board` (flat card list + column list).
- **AI board update flow**: if the AI returns a board, the backend (1) checks for duplicate card IDs, (2) merges existing card metadata (priority, due_date, labels, checklist, comments, color) back onto AI-updated cards (the AI does not modify metadata), (3) carries archived cards back into the merged board, (4) validates the result with `BoardData.model_validate`, (5) saves if valid, otherwise discards. The frontend applies the returned board directly (`setBoard(aiBoard)`) without calling `persist()` because the backend already saved.
- Invalid AI output is silently discarded; the existing board is preserved.

---

### Keyboard Shortcuts

All shortcuts are documented in the `ShortcutsModal` and enforced individually in each component:

| Context | Key | Action |
|---|---|---|
| Global | `?` | Open keyboard shortcut reference modal |
| Global | `Escape` | Close open modal or cancel active edit |
| Card edit | `Enter` (title field) | Save card |
| Card edit | `Escape` | Cancel edit |
| New card form | `Enter` | Submit |
| New card form | `Escape` | Dismiss form |
| Add column form | `Enter` | Submit |
| Add column form | `Escape` | Dismiss form |
| Board name | `Enter` | Save rename |
| Board name | `Escape` | Cancel rename |
| AI sidebar | `Enter` | Send message |
| AI sidebar | `Shift+Enter` | New line in message |
| Column rename | `Enter` | Save rename |

The `?` key listener is registered on `window` inside `KanbanBoard` via `useEffect`. It is guarded: if the event target is an `INPUT`, `TEXTAREA`, or has `isContentEditable === true`, the event is ignored.

The `ShortcutsModal` closes on Escape (via its own `keydown` listener) or on backdrop click (the outer `div`'s `onClick`). Clicking inside the modal panel calls `e.stopPropagation()` to prevent accidental close.

---

## State Management Pattern

All board mutations in `KanbanBoard` follow this pattern:

```
const prev = board;
const next: BoardData = { ...board, /* changes */ };
setBoard(next);          // optimistic UI update
void persist(prev, next); // async save
```

`persist` calls `saveBoard(boardId, next)`. On success it updates `lastUpdated`; on failure it rolls back to `prev` via `setBoard(prev)` and sets a `saveError` banner. AI board updates skip `persist()` — the backend already saved during the AI call.

---

## Test Coverage

**Backend** (`uv run pytest` from `backend/`): **101 tests** across:
- `tests/test_auth.py` — registration validation, login, logout, session persistence, change password
- `tests/test_board.py` — board CRUD, card field round-trips (priority, due_date, labels, checklist, comments, color, wipLimit, collapsed), archive logic, description, board ownership
- `tests/test_ai.py` — AI endpoint auth guard, board ownership guard, metadata merge

**Frontend** (`npm run test:unit` from `frontend/`): **85 tests** across:
- `lib/kanban.test.ts` — `moveCard`, `moveColumn`, `matchesFilter`, `timeAgo` unit tests
- `components/LoginForm.test.tsx` — sign-in and register flows
- `components/AISidebar.test.tsx` — send message, AI response rendering, board update callback, clear chat
- `components/ChangePasswordModal.test.tsx` — validation, success, API error
- `components/KanbanBoard.test.tsx` — column rename, add card, archive, edit, rollback on save failure, profile menu, color accent, comments, duplicate, WIP limit, collapse, shortcuts modal (`?` key and help button), `?` key guard inside inputs
- `components/ShortcutsModal.test.tsx` — renders shortcut rows, Escape closes, backdrop click closes, panel click does not close, close button

---

## Technical Decisions

- **Next.js 16** with TypeScript and Tailwind CSS. Static export (`next build` → `frontend/out/`) served by FastAPI.
- **`@dnd-kit/core` + `@dnd-kit/sortable`** for drag-and-drop (cards and columns).
- **FastAPI** with **`uv`** for Python dependency management.
- **SQLite** with `sqlite3` (stdlib). Schema and migrations run on startup via `init_db()`.
- **Starlette `SessionMiddleware`** for signed session cookies.
- **PBKDF2-SHA256** (Python stdlib `hashlib`) for password hashing — 100,000 iterations, random 16-byte salt.
- **OpenAI `gpt-4o-mini`** with Structured Outputs (strict JSON schema) for AI board updates.
- `OPENAI_API_KEY` is read server-side from `.env`; it is never sent to the frontend.
- No Docker. Local start/stop scripts in `scripts/` for Windows, macOS, and Linux.

---

## Constraints

- Run locally without Docker.
- API key stays server-side only.
- All API routes under `/api`; frontend at `/`.
- No emojis anywhere in code or documentation.
- No features beyond the current scope unless explicitly requested.
- Update `docs/PLAN.md` and `docs/ToDos.md` before starting any implementation work.
