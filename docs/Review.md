# Code Review: Project Management MVP

*Original review date: 2026-06-03 | Assessment and fixes applied: 2026-06-03*

---

## Summary of Assessment

Each finding was verified against the actual code. Three changes were applied and all tests pass (26 backend, 19 frontend). Two findings were incorrect. The remainder were valid observations that do not warrant changes for this MVP scope.

---

## Critical: Security Issue — API Key Exposure

The `.env` file at the project root was read during the review process and contains a live OpenAI API key. Review tools and processes should be configured to skip `.env` files entirely. The session secret key is also hardcoded as `"dev-secret-change-in-production"` in `backend/app/main.py:24`. While documented as a dev-only default, it should use a generated fallback at minimum.

**Action:** Rotate the exposed key outside this project. No code change made — the default fallback key is an acceptable dev-only pattern.

---

## Backend Issues

### 1. Dead code — `ask()` function ✅ Fixed
**File:** `backend/app/ai.py`

`ask()` was never called by any route; it existed only to support three tests that tested the function itself. Removed `ask()` from `ai.py` and removed the three dependent tests from `test_ai.py` (`test_ask_calls_openai_with_prompt`, `test_ask_returns_empty_string_for_none_content`, `test_ask_live_2_plus_2`). The two remaining tests in `test_ai.py` (`test_model_is_gpt4o_mini`, `test_get_client_raises_if_api_key_missing`) are unaffected.

### 2. Duplicate card IDs silently dropped ✅ Fixed
**File:** `backend/app/ai_router.py`

If the AI returned two cards with the same ID, the dict comprehension silently discarded one card with no error raised or logged. Added a duplicate ID check before the comprehension; if duplicates are detected the response is treated as invalid and `saved_board` is set to `None`, consistent with the existing validation failure path.

### 3. No logging configuration — No change
**File:** `backend/app/main.py`

uvicorn configures Python logging handlers on startup. The `WARNING` and `ERROR` calls in `ai_router.py` are visible when running via uvicorn. No change needed for this local MVP.

### 4. Board validation double conversion — No change
**File:** `backend/app/ai_router.py`

The code works correctly. Merging `AIChatBoard` and `BoardData` would remove the intentional structural separation maintained for the OpenAI Structured Outputs constraint (cards as list vs. dict). Refactoring adds complexity for no functional gain.

### 5. No size limits on board data — No change
**File:** `backend/app/board.py`

Single local user with hardcoded authentication. Adding Pydantic field size constraints is over-engineering for this scope.

### 6. `init_db()` has no error handling — No change
**File:** `backend/app/database.py`

A raw traceback on disk/permission failure is acceptable for a local development tool. Adding graceful error wrapping would add code without practical benefit here.

### 7. Duplicate Pydantic model definitions — No change
**Files:** `backend/app/ai.py`, `backend/app/board.py`

The duplication is intentional and documented: `AIChatBoard.cards` must be a `list` (OpenAI Structured Outputs schema constraint), while `BoardData.cards` is a `dict`. Merging would require a custom serializer that adds more complexity than the current duplication.

---

## Frontend Issues

### 1. Fragile column lookup in tests — No change
**File:** `frontend/src/components/KanbanBoard.test.tsx:19`

`screen.getAllByTestId(/^column-/)[0]` returns the first column in DOM order (Backlog), which is stable for the fixed `initialData`. Minor fragility but not a practical issue.

### 2. Rollback test may falsely pass ✅ Fixed
**File:** `frontend/src/components/KanbanBoard.test.tsx`

Added `await waitFor(() => expect(vi.mocked(saveBoard)).toHaveBeenCalled())` before checking the rollback. Without this, a broken `handleEditCard` that never called `persist()` would leave the UI unchanged and the test would pass, masking the bug.

### 3. No retry on save failure — No change
**File:** `frontend/src/components/KanbanBoard.tsx`

Adding retry logic is outside MVP scope and adds meaningful complexity.

### 4. Missing dependency lint in useEffect — Incorrect finding
**File:** `frontend/src/components/AISidebar.tsx:18-21`

The `useEffect` deps `[messages, loading]` are correct. `bottomRef` is a ref — React's exhaustive-deps rule explicitly excludes refs from the deps requirement because refs are stable. ESLint would not flag this.

### 5. Array index as React key for chat messages — No change
**File:** `frontend/src/components/AISidebar.tsx`

Messages are append-only; indices are stable for the lifetime of the component. Acceptable for this MVP.

---

## Testing Issues

### 1. Invalid board test patches wrong exception type — No change
**File:** `backend/tests/test_ai_chat.py`

Patching `model_validate` to raise `ValueError` exercises the `except Exception` branch rather than `except ValidationError`, but both branches produce the same outcome (`saved_board = None`, DB unchanged). The test correctly verifies the intended behaviour.

### 2. Misleading test name — No change
**File:** `backend/tests/test_board.py`

`test_put_board_invalid_does_not_overwrite` is a minor naming issue. The test itself is correct and useful.

### 3. Indistinguishable empty string return — Moot
**File:** `backend/tests/test_ai.py`

This finding concerned `ask()`, which has been removed.

---

## Architectural Observations

### 1. Drop target detection relies on ID prefix convention — Incorrect finding
**File:** `frontend/src/lib/kanban.ts`

The `isColumnId` helper uses `columns.some((column) => column.id === id)` — a proper array lookup, not prefix matching. Column vs. card distinction is determined by membership in the columns array, not by any `col-`/`card-` prefix convention. No change needed.

### 2. Race condition on rapid state mutations — No change
**File:** `frontend/src/components/KanbanBoard.tsx`

The race is real: a failed second save rolls back to `prev` captured before the first mutation's optimistic update. Fixing it requires `useRef` or `useReducer` for the previous-state bookmark. For a local single-user app where save requests complete in milliseconds, this is an acceptable edge case.

### 3. No abort controllers on fetch calls — No change
**File:** `frontend/src/lib/api.ts`

Acceptable for MVP. Component unmounts mid-request are transient and cause no observable corruption in this app.

### 4. No loading transition after login — No change
**File:** `frontend/src/app/page.tsx`

Brief "Loading…" flash between login and board display is acceptable for MVP.

---

## Code Quality Highlights

- Consistent coding style across both frontend and backend
- Good separation of concerns in backend modules (auth, board, ai, database)
- Solid test coverage with a clean fixture chain (`test_db` → `client` → `auth_client`)
- Proper error handling for AI board validation failures — invalid AI output never corrupts the saved board
- Clean UI with consistent theming using CSS custom properties
- Well-structured board state management with optimistic updates and rollback
