# Code Review

**Date:** 2026-06-05
**Scope:** Full codebase — backend (FastAPI/Python), frontend (Next.js/TypeScript), tests

---

## Summary

The codebase is well-structured, clean, and appropriate in scope for a local single-user app. Security fundamentals are solid: passwords are hashed with PBKDF2-SHA256, comparison uses `hmac.compare_digest`, user/board creation is atomic, and board content is validated through a strict Pydantic `model_validator`. The test suite is broad and well-organized.

Four correctness issues are identified — two of which contradict documented behavior — along with two validation gaps and a handful of low-severity code quality items.

---

## Correctness Bugs

### 1. `ArchivePanel` delete fires immediately — no confirmation — `frontend/src/components/ArchivePanel.tsx:59-66`

`CLAUDE.md` documents: *"Delete requires a second click (confirmation inline)."* The current implementation deletes immediately on the first click:

```tsx
<button type="button" onClick={() => onDelete(card.id)}>
  Delete
</button>
```

There is no per-card `confirmingDelete` state. A user who fat-fingers the Delete button permanently destroys an archived card with no way to undo it. Every other destructive action in the app (board delete, column delete, import replace) requires a confirmation step.

**Fix:** add `confirmingId: string | null` state to `ArchivePanel`. On first click, set `confirmingId = card.id` and render "Are you sure?" + "Yes, delete" / "Cancel" inline. Call `onDelete` only on the second click.

---

### 2. `handleMoveCardToColumn` does not check the target column's WIP limit — `frontend/src/components/KanbanBoard.tsx:250-266`

```typescript
const handleMoveCardToColumn = (cardId: string, fromColumnId: string, toColumnId: string) => {
  const prev = board;
  const next: BoardData = {
    ...board,
    columns: board.columns.map((col) => {
      if (col.id === fromColumnId) return { ...col, cardIds: col.cardIds.filter(...) };
      if (col.id === toColumnId)   return { ...col, cardIds: [...col.cardIds, cardId] };
      return col;
    }),
  };
  setBoard(next);
  void persist(prev, next);
};
```

The "Move to column" dropdown in `KanbanCard` calls this handler without checking whether the destination column is at or over its WIP limit. A column capped at 2 cards can silently exceed that cap via a move, even though `NewCardForm` correctly blocks new additions and `handleRestoreCard` correctly blocks restores.

**Fix:** before building `next`, check the target column's `wipLimit` the same way `handleRestoreCard` does, and surface an error via `setSaveError` if it would be exceeded.

---

### 3. `handleAiBoardUpdate` does not update the `lastUpdated` timestamp — `frontend/src/components/KanbanBoard.tsx:434-438`

```typescript
const handleAiBoardUpdate = (aiBoard: BoardData) => {
  setBoard(aiBoard);
  setSaveError(null);
  // Backend already saved the board during the AI call — no persist() needed
};
```

The backend updates `boards.updated_at` during the AI chat call. The frontend `lastUpdated` state is not updated, so the "Last updated X ago" display in the board header shows the time of the last *manual* save, not the AI save. The timestamp drifts until the user makes a manual change.

**Fix:** add `setLastUpdated(new Date().toISOString())` after `setBoard(aiBoard)`.

---

### 4. `page.tsx` suppresses `exhaustive-deps` — `frontend/src/app/page.tsx:53`

```tsx
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

`fetchBoardsAndNavigate` is used inside the mount `useEffect` but not listed as a dependency. The function is currently safe (it only calls stable setter functions), but the suppression hides future regressions. If `fetchBoardsAndNavigate` is ever changed to close over mutable state, the bug would be invisible.

**Fix:** wrap `fetchBoardsAndNavigate` in `useCallback` with its actual dependencies and remove the disable comment.

---

## Validation Gaps

### 5. `Column.wipLimit` has no server-side minimum constraint — `backend/app/board.py:55-60`

```python
class Column(BaseModel):
    id: str
    title: str
    cardIds: list[str]
    wipLimit: int | None = None
    collapsed: bool = False
```

The model accepts `wipLimit: 0` or any negative integer. A PUT request with `wipLimit: 0` passes Pydantic validation, gets saved to the database, and makes the column permanently unable to accept any cards through the normal UI flow (both `NewCardForm` and `handleRestoreCard` check `cards.length >= wipLimit`). The frontend `commitWipLimit` correctly requires `parsed > 0`, but the API has no such constraint.

**Fix:**

```python
from pydantic import Field

wipLimit: int | None = Field(None, ge=1)
```

---

### 6. No maximum length on card and column titles — `backend/app/board.py`

`Card.title`, `Card.details`, `Column.title`, `Column.id`, and `Comment.text` are all unconstrained `str` fields. A crafted PUT request could submit a title that is megabytes long. For a local app this is low risk, but it means unbounded content is stored in the SQLite `boards.content` column.

**Suggested fix:** add `Field(max_length=...)` to the most user-visible fields:

```python
class Card(BaseModel):
    id: str = Field(max_length=100)
    title: str = Field(max_length=500)
    details: str = Field(max_length=20_000)
    ...

class Column(BaseModel):
    id: str = Field(max_length=100)
    title: str = Field(max_length=200)
    ...
```

---

## Low Severity / Code Quality

### 7. `ai.py`: unchecked `choices[0]` — `backend/app/ai.py:53`

```python
parsed = response.choices[0].message.parsed
```

If the OpenAI API returns a response with an empty `choices` list (refusal or unexpected response), this raises an unhandled `IndexError`. The `ai_chat_endpoint` would return a 500 rather than a graceful message.

**Fix:**

```python
if not response.choices:
    return AIChatResponse(message="The AI did not return a response.")
parsed = response.choices[0].message.parsed
```

---

### 8. `saveError` has no dismiss button — `frontend/src/components/KanbanBoard.tsx:479-486`

```tsx
{saveError && (
  <div role="alert" ...>
    {saveError}
  </div>
)}
```

The error banner is cleared only by the next successful `persist()` call. A user who triggers a save failure and then stops editing (e.g., switches tabs) will see the error banner indefinitely on their next visit to the board, with no way to dismiss it manually.

**Fix:** add an `×` close button that calls `setSaveError(null)`.

---

### 9. `wipDraft` state not synced when WIP limit changes externally — `frontend/src/components/KanbanColumn.tsx:58`

```typescript
const [wipDraft, setWipDraft] = useState<string>(
  column.wipLimit != null ? String(column.wipLimit) : ""
);
```

`wipDraft` is initialized from `column.wipLimit` at mount and never updated if the prop changes (e.g., after an AI board update resets the limit). If a user then opens the WIP limit editor, they see a stale value.

**Fix:** add a `useEffect` mirroring the pattern used for `titleValue`:

```typescript
useEffect(() => {
  if (!editingWipLimit) {
    setWipDraft(column.wipLimit != null ? String(column.wipLimit) : "");
  }
}, [column.wipLimit, editingWipLimit]);
```

---

### 10. Profile menu has no keyboard dismissal or `aria-expanded` — `frontend/src/components/KanbanBoard.tsx:618-644`

The profile dropdown opens on click but has no `Escape` handler and no `aria-expanded` attribute on the trigger button. Keyboard-only users who open the menu cannot close it without clicking elsewhere or tabbing through all its items.

**Fix:** add `aria-expanded={showProfileMenu}` to the trigger button and a `useEffect` (or `onKeyDown`) that calls `setShowProfileMenu(false)` on `Escape`.

---

### 11. Inline import in test — `backend/tests/test_ai_router.py:225`

```python
def test_rename_board_updates_timestamp(...):
    before = auth_client.get("/api/boards").json()[0]["updated_at"]
    import time; time.sleep(0.01)
```

`import time` should be at the top of the file. The inline placement is a linting violation and easy to miss when reading the import list.

---

### 12. No rate limiting on auth endpoints

`POST /api/auth/login` and `POST /api/auth/register` accept unlimited requests. For a localhost-only app the risk is very low. If the bind address is ever widened, both endpoints become trivially brute-forceable. `slowapi` is the standard lightweight option for FastAPI.

---

## Test Coverage

### Backend — current state

| File | Tests | Covers |
|---|---|---|
| `test_auth.py` | 14 | login, register (validation, duplicate, creates board), logout, me, change password |
| `test_board.py` | 28 | CRUD, ownership, WIP limit, collapse, archive, description, color, comments, cross-user isolation |
| `test_database.py` | 10 | `hash_password` / `verify_password` round-trips, format, tampered hash, wrong password |
| `test_ai_router.py` | 14 | auth, ownership, message-only, board update + persistence, metadata preservation, duplicate card IDs, history limits, archived card preservation, color/due_date validation, rename timestamp |
| `test_main.py` | 1 | health endpoint |

Total backend: ~74 tests.

### Frontend — current state

| File | Tests | Covers |
|---|---|---|
| `kanban.test.ts` | 31 | `matchesFilter`, `moveCard`, `moveColumn`, `timeAgo`, `createId` |
| `KanbanBoard.test.tsx` | 16 | add/edit/archive/duplicate/rollback/WIP limit/collapse/shortcuts/change-password modal |
| `AISidebar.test.tsx` | 7 | render, send, AI response, loading, error, board update callback, clear |
| `BoardStats.test.tsx` | 8 | total count, archived exclusion, overdue, checklist progress |
| `FilterBar.test.tsx` | 8 | search, priority chips, overdue toggle, clear |
| `LoginForm.test.tsx` | misc | login and register flows |
| `ChangePasswordModal.test.tsx` | misc | validation, submit, auto-close |
| `ShortcutsModal.test.tsx` | misc | render, close |

Total frontend: ~60 unit tests.

### Remaining gaps

| Gap | Severity |
|---|---|
| `ArchivePanel` immediate-delete behavior (issue 1 above) | High |
| `handleMoveCardToColumn` WIP bypass (issue 2 above) | Medium |
| `handleRestoreCard` WIP enforcement | Medium |
| `handleImportFile` validation rejecting bad data | Low |
| `handleAiBoardUpdate` `lastUpdated` update (issue 3 above) | Low |
| Multi-board workflows (create, switch, delete) | Low |
| Drag-and-drop card and column reordering | Low |

---

## Positive Observations

- `BoardData.model_validator` enforces the cardIds / cards / archivedCardIds referential integrity invariant on every write — corrupted board state cannot be persisted through the API.
- `verify_password` uses `hmac.compare_digest` for constant-time comparison; no timing oracle.
- User + board creation in `register()` is a single atomic transaction — no partial account state possible on crash.
- The `persist` / rollback pattern in `KanbanBoard.tsx` is applied consistently across all 14 mutation handlers; optimistic updates roll back cleanly on any network error.
- AI metadata-merge in `ai_router.py` correctly preserves priority, due_date, labels, checklist, comments, and color when the AI only changes titles and column membership.
- `ChatRequest.history` is bounded server-side with `Field(max_length=200)`, preventing memory exhaustion from oversized payloads.
- `Card.color` is validated against `#[0-9a-fA-F]{6}` server-side, blocking CSS injection via crafted imports or AI-generated boards.
- `Card.due_date` is validated with `date.fromisoformat()`, preventing garbage dates from reaching the frontend.
- `get_current_user` is defined before any route that references it — correctly avoiding a `NameError` from `Depends` evaluating at function-definition time.
- `OPENAI_API_KEY` is kept server-side and never exposed to the frontend.
- The OpenAI client uses `@lru_cache(maxsize=1)` — the client is constructed once per process, not per request.
- Test fixture isolation is solid: `conftest.py` creates a fresh `tmp_path` SQLite DB per test, and `default_board_id` is queried dynamically rather than hardcoded.
- `AISidebar` correctly passes `messages` (prior history, not including the in-flight message) as history to `chatWithBoard`, so the new user message is never double-submitted.
- All `void persist(...)` calls satisfy TypeScript's unhandled-promise rule without suppression or cast.
