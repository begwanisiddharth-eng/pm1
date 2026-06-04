# Final Iteration Plan: Column WIP Limits, Column Collapse, and Keyboard Shortcut Reference

## Overview

This plan covers the three features that complete the Project Management app:

1. **Column WIP limits** — each column can have an optional maximum card count (work-in-progress limit). The column header gives a visual warning when at or over the limit, and a hard block on adding cards when over.
2. **Column collapse** — columns can be collapsed to a slim vertical strip to hide their cards and reclaim horizontal space; a single click expands them again.
3. **Keyboard shortcut reference** — a `ShortcutsModal` component lists all keyboard shortcuts in the app; it is opened by pressing `?` anywhere on the board screen or by clicking a help button in the board header; Escape closes it.

These three features are entirely frontend-only. No new backend routes or schema changes are needed; the `wipLimit` and `collapsed` fields are stored as part of the board JSON that the existing `PUT /api/boards/{id}` endpoint already persists.

---

## Feature 1: Column WIP Limits

### Goal

Let users set a maximum number of active (non-filtered) cards per column. This is a standard Kanban practice to prevent bottlenecks. The limit is optional; columns without one behave as before.

### Detailed Design

**Data model** (`Column` type in `kanban.ts`):
```typescript
type Column = {
  id: string;
  title: string;
  cardIds: string[];
  wipLimit?: number | null;
  collapsed?: boolean;
};
```

**Backend `board.py`** — extend the `Column` Pydantic model:
```python
class Column(BaseModel):
    id: str
    title: str
    cardIds: list[str]
    wipLimit: int | None = None
    collapsed: bool = False
```

The `BoardData` validator references `col.cardIds` for the card-reference check, which is unaffected by these new fields.

**Visual states in `KanbanColumn.tsx`**:
- WIP limit not set: column header renders normally.
- Card count < limit: column header renders normally (no warning).
- Card count == limit: column header pill turns amber/orange to signal "at capacity".
- Card count > limit: column header pill turns red to signal "over limit".
- When over the WIP limit, the "Add a card" button in `NewCardForm` is disabled (or hidden) with a tooltip message.

**Setting the WIP limit**:
- A small "Set limit" button or inline input appears in the column header.
- When clicked, an inline number input appears (min 1, no max). Enter or blur saves; Escape cancels.
- Setting to empty/zero removes the limit.

**Propagation**:
- `KanbanColumn` receives `onSetWipLimit(columnId, limit)` prop.
- `KanbanBoard` handles `handleSetWipLimit` by updating the column's `wipLimit` in board state and calling `persist`.

### Tests

- Backend: `PUT /api/boards/{id}` with `wipLimit` on a column round-trips correctly.
- Backend: `wipLimit` defaults to `null` when omitted.
- Frontend: column shows amber warning when card count equals WIP limit.
- Frontend: column shows red warning when card count exceeds WIP limit.
- Frontend: setting WIP limit calls `saveBoard` with the updated limit.
- Frontend: removing WIP limit (set to null) calls `saveBoard` with `null`.

---

## Feature 2: Column Collapse

### Goal

Let users collapse individual columns to a slim vertical strip. The strip shows only the column title (rotated vertically) and the card count badge. Clicking the strip toggles it back to expanded. This lets users focus on fewer columns without deleting or reordering.

### Detailed Design

**Data model** — `collapsed: boolean = false` field on `Column` (already included above).

**Visual design for collapsed state**:
- The column's `min-w` and flex styling change from the normal wide card to a narrow strip (e.g. `w-10` or `w-12`).
- The column title is rendered rotated 90 degrees (CSS `writing-mode: vertical-rl` or `rotate-90`).
- The card count badge is shown at the top.
- The column content (cards, add-card form) is hidden.
- A collapse/expand toggle button (chevron icon) appears in the column header.

**Toggle button placement**: a small chevron button in the column header, right of the title area, always visible. Clicking toggles the `collapsed` state.

**Propagation**:
- `KanbanColumn` receives `onToggleCollapse(columnId)` prop.
- `KanbanBoard` handles `handleToggleCollapse` by toggling the `collapsed` boolean and calling `persist`.

**Drag-and-drop**: Collapsed columns can still be drag-targets for cards (the dnd-kit droppable area is preserved). Collapsed columns can also be dragged to reorder.

### Tests

- Frontend: clicking the collapse toggle hides the card list.
- Frontend: clicking the toggle again shows the card list.
- Frontend: toggling collapse calls `saveBoard`.
- Frontend: collapsed column shows card count and title.

---

## Feature 3: Keyboard Shortcut Reference Modal

### Goal

Provide a discoverable reference for all keyboard shortcuts in the app. Pressing `?` (Shift+/) anywhere on the board screen, or clicking a `?` help button in the board header, opens a modal listing all shortcuts. Escape (or clicking outside) closes it.

### Detailed Design

**`ShortcutsModal.tsx`** — new component. Contains a table of shortcut rows grouped by context:

| Context | Key | Action |
|---|---|---|
| Global | `?` | Open this shortcut reference |
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
| AI sidebar | `Shift+Enter` | New line |
| Column rename | `Enter` | Save rename |

**Integration in `KanbanBoard.tsx`**:
- Add `showShortcuts` boolean state.
- Add `keydown` handler on `window` (or on the board container) for the `?` key that sets `showShortcuts(true)`. Guard: ignore if the event target is an input, textarea, or has `[contenteditable]` to avoid hijacking form input.
- Add a `?` icon/button in the board header that sets `showShortcuts(true)`.
- Render `<ShortcutsModal>` when `showShortcuts` is true; pass `onClose`.

**`ShortcutsModal.tsx`** structure:
- Backdrop div (fixed overlay, click-outside closes).
- Modal panel with two-column shortcut table.
- Escape key handler closes.

### Tests

- Frontend: `?` key opens the shortcuts modal.
- Frontend: Escape closes the modal.
- Frontend: clicking the backdrop closes the modal.
- Frontend: the modal renders a table of shortcuts.
- Frontend: `?` key does NOT open modal when focus is inside an input.

---

## Backend Changes

Only the `Column` Pydantic model in `board.py` needs to be extended. No new routes.

```python
class Column(BaseModel):
    id: str
    title: str
    cardIds: list[str]
    wipLimit: int | None = None
    collapsed: bool = False
```

Add backend tests:
- `wipLimit` round-trips correctly (saved and returned).
- `wipLimit` defaults to `null` when omitted.
- `collapsed` round-trips correctly.
- `collapsed` defaults to `false` when omitted.

---

## Frontend Changes Summary

### `lib/kanban.ts`
- Extend `Column` type: add `wipLimit?: number | null` and `collapsed?: boolean`.

### `backend/app/board.py`
- Extend `Column` model: `wipLimit: int | None = None`, `collapsed: bool = False`.

### `components/KanbanColumn.tsx`
- Add `onSetWipLimit(columnId, limit)` and `onToggleCollapse(columnId)` props.
- Add WIP limit inline editor in column header.
- Apply colour coding to card count badge based on WIP limit status.
- Disable add-card form when over limit.
- Add collapse/expand toggle button.
- Render collapsed state (slim strip with rotated title and count badge).

### `components/KanbanBoard.tsx`
- Add `handleSetWipLimit(columnId, limit)` — updates `columns[i].wipLimit` and calls `persist`.
- Add `handleToggleCollapse(columnId)` — toggles `columns[i].collapsed` and calls `persist`.
- Add `showShortcuts` state; wire `?` key and help button; render `<ShortcutsModal>`.
- Pass new props to `KanbanColumn`.

### `components/NewCardForm.tsx`
- Accept `disabled?: boolean` prop; when true, button is disabled and a tooltip-like message appears.

### `components/ShortcutsModal.tsx` (new)
- Shortcut reference table grouped by context.
- Backdrop click and Escape close.

### Tests

**`backend/tests/test_board.py`**: 4 new tests for `wipLimit` and `collapsed` round-trips (74 total).

**`frontend/src/components/KanbanBoard.test.tsx`**:
- WIP limit: setting a limit updates the column; over-limit warning appears; add-card disabled.
- Collapse: toggle hides cards; second toggle shows cards; saves to backend.
- Shortcuts: `?` key opens modal; Escape closes; help button opens.

**`frontend/src/components/ShortcutsModal.test.tsx`** (new):
- Renders shortcut rows.
- Escape closes.
- Backdrop click closes.

---

## Success Criteria

- Users can set, update, and remove a WIP limit on any column; limit is persisted.
- Column header changes colour (amber at capacity, red over limit) to warn the user.
- Adding a card is blocked when the column is over its WIP limit.
- Columns can be individually collapsed and expanded; state is persisted.
- Pressing `?` opens the shortcut reference; it does not fire inside text inputs.
- All new and existing tests pass; ESLint clean; build succeeds.
- Backend: 74 tests. Frontend: 57+ tests.
