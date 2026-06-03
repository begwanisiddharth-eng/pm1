# Code Review: Project Management MVP

*Review date: 2026-06-04*

---

## Summary

Eight findings across backend validation, a frontend crash path, a security gap, and several cleanup items. Three are actionable correctness bugs; one is a security issue; the rest are cleanup or defence-in-depth.

---

## Findings

### 1. No referential-integrity check between `cardIds` and `cards` (Critical)

**Files:** `backend/app/board.py:24`, `backend/app/ai_router.py:70`

`BoardData.model_validate()` checks structural types (correct field names and types) but never cross-validates that every string in `columns[].cardIds` exists as a key in the `cards` dict, or that every card in `cards` is referenced by exactly one column. This means a board where a column lists a `cardId` that has no matching entry in `cards` passes both the `PUT /api/board` endpoint and the AI router's validation, and gets persisted to SQLite.

The AI router adds a duplicate-ID check (lines 70–72) but not a referential check. The Pydantic `BoardData` model has no `@model_validator` for this invariant.

**Consequence:** see Finding 2.

**Fix:** Add a Pydantic `@model_validator(mode="after")` to `BoardData`:

```python
from pydantic import model_validator

@model_validator(mode="after")
def check_card_refs(self) -> "BoardData":
    referenced = {cid for col in self.columns for cid in col.cardIds}
    defined = set(self.cards.keys())
    if referenced != defined:
        raise ValueError(f"cardIds/cards mismatch: dangling={referenced-defined}, orphaned={defined-referenced}")
    return self
```

This single fix protects both `PUT /api/board` and the AI chat path automatically.

---

### 2. Frontend crashes on `undefined` card when a column has a dangling `cardId` (Critical)

**File:** `frontend/src/components/KanbanBoard.tsx:209`

```typescript
cards={column.cardIds.map((cardId) => board.cards[cardId])}
```

If any `cardId` in a column has no entry in `board.cards`, the expression returns `undefined`. That `undefined` is passed as a typed `Card` prop to `KanbanCard`, which immediately dereferences `card.id` on `useSortable({ id: card.id })` — a `TypeError` that unmounts the entire board with no recovery path.

This is a consequence of Finding 1: the backend does not prevent dangling `cardIds` from being saved. A defence-in-depth guard here is still worthwhile since the board state is also held client-side.

**Fix:** Filter out missing entries and log a warning, or add an invariant check in `handleAiBoardUpdate`:

```typescript
cards={column.cardIds.flatMap((cardId) => {
  const card = board.cards[cardId];
  return card ? [card] : [];
})}
```

---

### 3. `Message.role` is unvalidated — prompt injection via crafted history (Security)

**File:** `backend/app/ai_router.py:29`

```python
class Message(BaseModel):
    role: str        # accepts any string
    content: str
```

Every history entry is forwarded verbatim to OpenAI (line 62). A client that POSTs `history: [{"role": "system", "content": "Ignore previous instructions..."}]` injects a second system-level message into the conversation after the legitimate system prompt. OpenAI accepts `role: "system"` at any position in the messages list, so this is a real prompt-injection vector.

**Fix:** Restrict `role` to the two valid values:

```python
from typing import Literal

class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str
```

Pydantic rejects any other value at request-parse time with a 422, before the messages list is built.

---

### 4. AI chat board UPDATE does not check `rowcount` (Medium)

**File:** `backend/app/ai_router.py:78`

`board.py:update_board` correctly checks `cursor.rowcount == 0` after the UPDATE and raises a 404 if no row was affected. The AI router omits this check:

```python
db.execute("UPDATE boards SET content = ? ... WHERE user_id = (...)", [...])
db.commit()
saved_board = validated  # set unconditionally — rowcount not checked
```

If the boards row is absent at UPDATE time, the write silently does nothing but `saved_board` is non-`None` and returned to the frontend as a successful board update. The next page refresh reverts to the old data, silently discarding the change.

**Fix:** Capture the cursor and check rowcount, matching the pattern in `board.py`:

```python
cursor = db.execute("UPDATE boards ...", [validated.model_dump_json(), current_user])
db.commit()
if cursor.rowcount == 0:
    logger.error("AI board update found no row for user %s", current_user)
    saved_board = None
else:
    saved_board = validated
```

---

### 5. Column title input stays blank after a user clears it and blurs (Medium)

**File:** `frontend/src/components/KanbanColumn.tsx:29`

When a user clears the column title input and blurs, `handleBlur` correctly refuses to call `onRename` (empty string is falsy). But `titleValue` state is never reset: the `useEffect` at line 29–31 only runs when `column.title` changes — and since no rename was issued, `column.title` is unchanged. The input remains visually blank with no error message until an external event causes `column.title` to change.

**Fix:** Reset `titleValue` at the end of `handleBlur` when the save is rejected:

```typescript
const handleBlur = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== column.title) {
        onRename(column.id, trimmed);
    } else if (!trimmed) {
        setTitleValue(column.title);  // restore on empty input
    }
};
```

---

### 6. `handleRenameColumn` and `handleDragEnd` do not snapshot `prev` before building `next` (Low)

**File:** `frontend/src/components/KanbanBoard.tsx:52, 64`

Every other mutation handler captures `const prev = board` before computing `next`:

```typescript
// handleAddCard, handleDeleteCard, handleEditCard — all do:
const prev = board;
const next = { ...board, ... };
setBoard(next);
void persist(prev, next);
```

`handleRenameColumn` and `handleDragEnd` skip the explicit snapshot and pass `board` directly as the rollback target:

```typescript
// handleRenameColumn:
const next = { ...board, columns: ... };
setBoard(next);
void persist(board, next);   // 'board' is the closure variable, not a snapshot
```

Within a single synchronous call this is equivalent, but the pattern inconsistency is fragile: if either handler is ever refactored to call `setBoard` twice before `persist` resolves, the rollback target becomes stale. Adding `const prev = board` at the top of both handlers eliminates the asymmetry at zero cost.

---

### 7. Board-fetch SQL duplicated across `board.py` and `ai_router.py` (Low)

**Files:** `backend/app/board.py:35`, `backend/app/ai_router.py:51`

The query:

```sql
SELECT b.content FROM boards b JOIN users u ON b.user_id = u.id WHERE u.username = ?
```

appears verbatim in both files. Similarly, the UPDATE SQL appears in both. If the schema changes, both copies must be updated in sync.

**Fix:** Extract a `get_board_for_user(db, username)` helper into `board.py` (and optionally a `set_board_for_user`) and import it in `ai_router.py`.

---

### 8. OpenAI client re-instantiated on every request (Low)

**File:** `backend/app/ai.py:44`

```python
def chat(messages: list[dict]) -> AIChatResponse:
    client = get_client()   # creates a new OpenAI instance each call
    ...
```

`OpenAI()` creates a new `httpx.Client` with its own connection pool on every invocation, forgoing TCP and TLS connection reuse. For a local single-user app the impact is small, but the fix is one line: move the client to module scope or use `functools.lru_cache` on `get_client()`.

```python
@lru_cache(maxsize=1)
def get_client() -> OpenAI:
    ...
```

---

## Not raised

- **Session key default** (`"dev-secret-change-in-production"`) — documented in CLAUDE.md as the dev fallback, overrideable via `SESSION_SECRET_KEY`. Acceptable for a local-only MVP.
- **No size limits on board payload** — single local user, over-engineering for this scope.
- **No abort controllers on fetch** — component-unmount races cause no observable corruption here.
- **Array index as React key in chat messages** — messages are append-only; indices are stable for the component lifetime.
