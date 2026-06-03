# Code Review

Reviewed on 2026-06-03. All 65 tests pass. The MVP is complete and well-structured. Findings are grouped by severity: **bugs** (would cause incorrect behavior), **risks** (likely to cause problems as the codebase grows), and **observations** (informational, no action needed).

---

## Bugs

None found. All behavior under test is correct.

---

## Risks

### 1. Silent failure when AI board validation fails (`backend/app/ai_router.py:81`)

```python
except (ValidationError, Exception):
    saved_board = None
```

`except (ValidationError, Exception)` is effectively `except Exception` — `ValidationError` is already a subclass of `Exception`. The intent (don't corrupt the saved board) is correct, but the broad catch with no logging means any unexpected error here is invisible. If the AI returns a structurally valid but semantically wrong board, validation passes and bad data is saved. If something else crashes in the try block, it silently returns `board: null` with no trace.

Suggestion: log the exception before continuing, and tighten the catch to the specific types that are actually expected (`ValidationError`, `json.JSONDecodeError`).

---

### 2. Optimistic UI with no rollback on save failure (`frontend/src/components/KanbanBoard.tsx:38-45`)

```typescript
const persist = async (next: BoardData) => {
  try {
    await saveBoard(next);
    setSaveError(null);
  } catch {
    setSaveError("Changes could not be saved. Please try again.");
  }
};
```

Board state updates immediately in the UI (`setBoard(next)`) and `persist()` is called fire-and-forget with `void persist(next)`. If the save fails, the user sees an error banner but the UI shows state that was never persisted. On page reload, the board reverts. This is a real UX inconsistency.

For MVP this is acceptable, but the next step up would be rolling back `setBoard` to the previous state on error, or at minimum making the error banner more prominent with a "Reload" button.

---

### 3. Seed data duplicated in three places

The default board content appears identically in:
- `backend/app/database.py` (`_SEED_BOARD`)
- `frontend/src/lib/kanban.ts` (`initialData`)
- `frontend/tests/kanban.spec.ts` (`SEED_BOARD`)

These must be kept in sync manually. The frontend `initialData` is no longer used by the running app (the board loads from the backend), but it is used by unit tests as a convenient fixture. If the seed shape ever changes, all three locations need updating, and a mismatch will be silent until a test fails for an unrelated reason.

---

### 4. Duplicate test fixtures across files (`backend/tests/`)

The `test_db`, `client`, and `auth_client` fixtures are defined identically in both `test_board.py` and `test_ai_chat.py`. If the fixture logic needs to change (e.g., enabling WAL mode, adding a row factory setting), it must be updated in both files. These belong in a shared `conftest.py`.

---

### 5. No session secret rotation path (`backend/app/main.py:25-28`)

```python
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "dev-secret-change-in-production"),
)
```

The fallback `"dev-secret-change-in-production"` is used whenever the env var is absent, including in all tests. This is fine for a local MVP, but worth noting: if `SESSION_SECRET_KEY` is ever rotated, all existing sessions are immediately invalidated. There's no documented mechanism to handle this. The current design makes a future rotation safe (one line of config), which is good.

---

## Observations

### Architecture is clean and well-layered

The separation is clear throughout: `app/ai.py` owns only the OpenAI client and response schemas; `app/ai_router.py` owns the HTTP handling and board persistence logic. Frontend API calls are all centralized in `src/lib/api.ts` with no fetch calls scattered across components. The `BoardData` Pydantic model in `board.py` is the single source of truth for the stored shape on the backend.

### AI card list→dict conversion is correct and documented (`backend/app/ai_router.py:66-68`)

```python
board_dict = {
    "columns": [c.model_dump() for c in ai_response.board.columns],
    "cards": {c.id: c.model_dump() for c in ai_response.board.cards},
}
```

OpenAI's Structured Outputs doesn't support `dict[str, ...]` schema at the top level, so `AIChatBoard.cards` is a list. The router converts it to the dict shape expected by `BoardData` before validation and storage. The comment in `ai.py` explains the constraint. This is the right approach.

### `handleAiBoardUpdate` correctly skips `persist()` (`frontend/src/components/KanbanBoard.tsx:120-124`)

The AI endpoint saves the validated board to the database before responding. The frontend correctly applies the returned board to state without calling `saveBoard()` again. The comment makes the reasoning explicit. This avoids a redundant round-trip and a potential double-write race.

### Column rename does not save on every keystroke

`KanbanColumn.tsx` only calls `onRename` (and therefore `persist()`) on `onBlur`, and only when the trimmed value has actually changed. This is the correct approach — one save per rename interaction rather than one per keypress.

### Drag-and-drop disables during card editing (`frontend/src/components/KanbanCard.tsx:57`)

```typescript
{...(isEditing ? {} : listeners)}
```

Spreading an empty object rather than the dnd-kit listeners when the card is in edit mode correctly prevents the dragging gesture from interfering with text selection inside inputs. Clean solution.

### `createId()` is not cryptographically secure (`frontend/src/lib/kanban.ts:164-168`)

`Math.random()` is used for card IDs. This is fine — these IDs are display-layer identifiers with no security surface. They don't need to be unguessable, just unique enough to avoid UI collisions.

### `get_client()` creates a new `OpenAI` instance on every AI call (`backend/app/ai.py:37-40`)

A new client is instantiated per request. The OpenAI SDK client is lightweight and doesn't hold a persistent connection, so this is not a meaningful cost for local single-user use. Not worth changing for MVP.

### `useMemo` on `board.cards` provides no benefit (`frontend/src/components/KanbanBoard.tsx:36`)

```typescript
const cardsById = useMemo(() => board.cards, [board.cards]);
```

`board.cards` is already the object reference. `useMemo` here just returns it unchanged, since the dependency and the return value are the same object. The memo has no cost, but also no benefit. `const cardsById = board.cards;` is equivalent.

### `itsdangerous` and `httpx` listed as direct backend dependencies

`itsdangerous` is used internally by Starlette's `SessionMiddleware` — it's not imported directly by project code. `httpx` is only needed for FastAPI's `TestClient` in tests. Neither is harmful to list as a top-level dependency, but they're indirect. If a dedicated `[test]` extras group were added to `pyproject.toml`, `httpx` would belong there.

### `StarletteDeprecationWarning` in backend tests

```
StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
```

This warning comes from Starlette's `TestClient`. It does not affect test correctness. Resolution requires Starlette (or FastAPI) to publish a stable API for the `httpx2` transition, which is not yet complete. No action needed now.

### Playwright tests reset board state in `beforeEach`

```typescript
await page.request.put("/api/board", { data: SEED_BOARD });
```

Board and auth state are explicitly reset before each e2e test group. This makes tests independent of run order and of each other, which is the right approach for tests against a stateful backend. The shared database (not a temp DB like the unit tests use) is a constraint of the e2e setup, and the reset pattern handles it correctly.

### `initialData` export in `kanban.ts` is test-only

`initialData` is no longer used by the running application — the board always loads from the backend. It serves as a convenient fixture in unit tests. This is benign but slightly misleading: a reader of `kanban.ts` might assume it's used at runtime. A `// used by unit tests` comment or moving it to a test helper file would clarify intent.
