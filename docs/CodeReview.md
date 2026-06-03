# Code Review

Reviewed on 2026-06-03. All 29 backend tests and 19 frontend unit tests pass.

A first review was performed, risks were mitigated, and this document was updated to reflect the current state. Findings are grouped by severity: **bugs** (incorrect behavior), **risks** (likely to cause problems as the codebase grows), and **observations** (informational, no action needed). Mitigated items are marked **[Fixed]** with a brief description of the change.

---

## Bugs

### 1. [Fixed] Board-fetch failure on initial load showed the login form instead of the error state (`frontend/src/app/page.tsx`)

The outer `.catch()` was shared between `getMe()` and `getBoard()`. A `getBoard()` rejection on initial load set the phase to `"unauthenticated"`, showing the login form to an already-authenticated user.

**Fix:** Added an inner `.catch(() => setPhase("board-error"))` directly on the `getBoard()` promise, matching what `handleLogin` already did. The outer catch now only fires if `getMe()` itself throws.

---

## Risks

### 2. [Fixed] Silent failure when AI board validation fails (`backend/app/ai_router.py`)

`except (ValidationError, Exception)` was effectively `except Exception` — `ValidationError` is already a subclass. Errors were swallowed with no logging.

**Fix:** Split into two separate `except` clauses. `ValidationError` logs a `WARNING`; any unexpected exception logs an `ERROR` with full traceback via `exc_info=True`. The `logging` module is used so output flows through uvicorn's log handler.

---

### 3. [Fixed] Optimistic UI with no rollback on save failure (`frontend/src/components/KanbanBoard.tsx`)

When `saveBoard()` failed, the UI showed an error banner but the local state remained at the failed-to-persist version. On reload the board reverted silently, causing the user to lose changes they thought were saved.

**Fix:** `persist(prev, next)` now takes both the prior and next board states. On `catch`, `setBoard(prev)` rolls the UI back to the last successfully-saved state before showing the error banner. All five mutation handlers pass `board` as `prev` at call time (before `setBoard(next)` runs). A test covering the rollback path was added to `KanbanBoard.test.tsx`.

---

### 4. [Fixed] Duplicate test fixtures across backend test files

`test_db`, `client`, and `auth_client` were defined identically in both `test_board.py` and `test_ai_chat.py`.

**Fix:** Created `backend/tests/conftest.py` with the shared `test_db` / `client` / `auth_client` fixture chain (isolated tmp SQLite, `get_db` override, pre-logged-in client). Both `test_board.py` and `test_ai_chat.py` now rely on conftest. `test_main.py` retains its own simpler local fixtures (no DB override) since those tests check auth against the real seeded DB.

---

### 5. No session secret rotation path (`backend/app/main.py:25-28`)

```python
secret_key=os.getenv("SESSION_SECRET_KEY", "dev-secret-change-in-production")
```

The fallback key is used whenever the env var is absent, including in all tests. This is fine for a local MVP. If `SESSION_SECRET_KEY` is ever rotated, all existing sessions are immediately invalidated — no grace-period mechanism exists. The current single-env-var design makes a future rotation straightforward.

*No code change made — acceptable for MVP.*

---

### 6. [Fixed] No conversation history length limit (`backend/app/ai_router.py`)

History from the client was forwarded to OpenAI without any bound, allowing a very long session to send an arbitrarily large token payload.

**Fix:** Added `_MAX_HISTORY_MESSAGES = 40` (20 conversation turns). The history is sliced with `body.history[-_MAX_HISTORY_MESSAGES:]` before building the messages list. The current user message is always appended in full regardless.

---

### 7. [Fixed] `pytest` and `httpx` in production dependencies (`backend/pyproject.toml`)

`pytest` (a test runner) and `httpx` (only needed for `TestClient` in tests) were listed under `[project] dependencies`, causing them to install in any production environment.

**Fix:** Moved both to `[dependency-groups] dev`. `uv` includes dev groups automatically in the project environment, so `uv run pytest` continues to work unchanged.

---

## Observations

### Architecture is clean and well-layered

The separation is clear throughout: `app/ai.py` owns only the OpenAI client and response schemas; `app/ai_router.py` owns the HTTP handling and board persistence logic. Frontend API calls are all centralized in `src/lib/api.ts` with no fetch calls scattered across components. The `BoardData` Pydantic model in `board.py` is the single source of truth for the stored shape on the backend.

---

### [Fixed] `PUT /api/board` now verifies that the UPDATE affected a row (`backend/app/board.py`)

Previously the cursor's `rowcount` was not checked, so a missing board row would silently return HTTP 200 without saving.

**Fix:** The cursor is captured from `db.execute()` and `rowcount == 0` raises a 404. In practice the board row always exists after `init_db`, so this path is unreachable in normal operation — but the endpoint now correctly surfaces the problem if it ever occurs.

---

### [Fixed] Silent discard when saving a card with a blank title (`frontend/src/components/KanbanCard.tsx`)

If the user cleared the title and clicked Save, the form closed silently and the original title was restored with no feedback.

**Fix:** `handleSave` now guards with `if (!trimmed) { setTitleError(true); return; }`, keeping the form open and rendering a `"Title is required."` alert (`role="alert"`) beneath the input. The error clears on any input change or on Cancel.

---

### Seed data duplicated in three places

The default board content appears identically in `backend/app/database.py` (`_SEED_BOARD`), `frontend/src/lib/kanban.ts` (`initialData`), and `frontend/tests/kanban.spec.ts` (`SEED_BOARD`). The frontend copies are used as test fixtures — `initialData` is no longer used at runtime (the board always loads from the backend).

*No code change made — consolidating across the stack boundary would add meaningful complexity for MVP. If the seed shape changes, all three must be updated.*

---

### AI card list→dict conversion is correct and documented (`backend/app/ai_router.py`)

OpenAI's Structured Outputs doesn't support `dict[str, ...]` at the schema level, so `AIChatBoard.cards` is a list. The router converts it to the dict shape expected by `BoardData` before validation and storage. The comment in `ai.py` explains the constraint.

---

### `handleAiBoardUpdate` correctly skips `persist()` (`frontend/src/components/KanbanBoard.tsx`)

The AI endpoint saves the validated board to the database before responding. The frontend applies the returned board to state without calling `saveBoard()` again, avoiding a redundant round-trip and a potential double-write race. The comment makes the reasoning explicit.

---

### Column rename does not save on every keystroke

`KanbanColumn.tsx` only calls `onRename` (and therefore `persist()`) on `onBlur`, and only when the trimmed value has actually changed — one save per rename interaction rather than one per keypress.

---

### Drag-and-drop listeners disabled during card editing (`frontend/src/components/KanbanCard.tsx`)

```typescript
{...(isEditing ? {} : listeners)}
```

Spreading an empty object instead of the dnd-kit listeners when the card is in edit mode prevents the drag gesture from interfering with text selection inside inputs.

---

### `createId()` is not cryptographically secure (`frontend/src/lib/kanban.ts`)

`Math.random()` is used for card IDs. These are display-layer identifiers with no security surface — they need to be unique enough to avoid UI collisions, not unguessable.

---

### `get_client()` creates a new `OpenAI` instance on every AI call (`backend/app/ai.py`)

A new client is instantiated per request. The OpenAI SDK client is lightweight and holds no persistent connection, so this is not a meaningful cost for local single-user use.

---

### `AISidebar` uses array index as message `key` (`frontend/src/components/AISidebar.tsx`)

```tsx
{messages.map((msg, i) => <div key={i} ...>)}
```

Safe here because the message list is strictly append-only. Worth noting if any future feature removes or reorders messages.

---

### `logout()` network failure is not handled (`frontend/src/app/page.tsx`)

If `logout()` rejects, the UI clears state and shows the login screen, but the server session remains active. On a local single-user colocated setup this is very unlikely. Acceptable for MVP.

---

### `itsdangerous` listed as a direct backend dependency

Used internally by Starlette's `SessionMiddleware`, not imported by project code. Harmless to list directly but more accurately a transitive dependency of `fastapi`/`starlette`.

---

### `StarletteDeprecationWarning` in backend tests

```
StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
```

Does not affect test correctness. Blocked on Starlette/FastAPI publishing a stable `httpx2` transition API.

---

### Playwright tests reset board state in `beforeEach`

```typescript
await page.request.put("/api/board", { data: SEED_BOARD });
```

Board and auth state are explicitly reset before each e2e test group, making tests independent of run order. The correct approach for tests against a stateful backend.

---

### `test_main.py` hits the real `pm.db`

`test_main.py`'s `client` fixture does not override `get_db` — it uses the real database initialized via the app lifespan. Auth smoke tests run against the live DB. Safe because `init_db` is idempotent and those tests only verify session behavior. All board and AI tests use isolated tmp DBs via conftest.py.
