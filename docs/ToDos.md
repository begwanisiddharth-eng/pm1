# ToDos: Final Iteration

Column WIP limits, column collapse, and keyboard shortcut reference modal.

---

## Backend

- [ ] Extend `Column` Pydantic model in `board.py`: add `wipLimit: int | None = None` and `collapsed: bool = False`.
- [ ] Add backend test: `PUT /api/boards/{id}` with `wipLimit` set on a column round-trips correctly.
- [ ] Add backend test: `wipLimit` defaults to `null` when omitted from the column.
- [ ] Add backend test: `PUT /api/boards/{id}` with `collapsed: true` on a column round-trips correctly.
- [ ] Add backend test: `collapsed` defaults to `false` when omitted from the column.

## Frontend — Data Layer

- [ ] Extend `Column` type in `lib/kanban.ts`: add `wipLimit?: number | null` and `collapsed?: boolean`.

## Frontend — WIP Limits

- [ ] `components/KanbanColumn.tsx`: add `onSetWipLimit: (columnId: string, limit: number | null) => void` prop.
- [ ] `components/KanbanColumn.tsx`: add inline WIP limit editor in the column header (number input shown on click; Enter/blur saves; Escape cancels; clear/empty removes the limit).
- [ ] `components/KanbanColumn.tsx`: apply colour to card count badge based on WIP state — normal when no limit or under limit, amber (`text-orange-600 bg-orange-50`) when at limit, red (`text-red-600 bg-red-50`) when over limit.
- [ ] `components/NewCardForm.tsx`: accept `disabled?: boolean` prop; when `true`, hide or disable the "Add a card" open button and show a brief message ("Column at WIP limit").
- [ ] `components/KanbanColumn.tsx`: pass `disabled` to `NewCardForm` when `cards.length >= column.wipLimit` (and `wipLimit` is set).
- [ ] `components/KanbanBoard.tsx`: add `handleSetWipLimit(columnId, limit)` — updates the matching column's `wipLimit` and calls `persist`.
- [ ] `components/KanbanBoard.tsx`: pass `onSetWipLimit={handleSetWipLimit}` to each `KanbanColumn`.

## Frontend — Column Collapse

- [ ] `components/KanbanColumn.tsx`: add `onToggleCollapse: (columnId: string) => void` prop.
- [ ] `components/KanbanColumn.tsx`: add a collapse/expand chevron button in the column header.
- [ ] `components/KanbanColumn.tsx`: when `column.collapsed` is true, render a slim vertical strip showing only the rotated column title and card count badge; hide cards, add-card form, and delete button.
- [ ] `components/KanbanBoard.tsx`: add `handleToggleCollapse(columnId)` — toggles `collapsed` on the matching column and calls `persist`.
- [ ] `components/KanbanBoard.tsx`: pass `onToggleCollapse={handleToggleCollapse}` to each `KanbanColumn`.

## Frontend — Keyboard Shortcut Reference

- [ ] `components/ShortcutsModal.tsx` (new): render a modal with a two-column shortcut table grouped by context (Global, Card edit, New card form, Add column, Board name, AI sidebar, Column rename). Backdrop click and Escape close it.
- [ ] `components/KanbanBoard.tsx`: add `showShortcuts` boolean state.
- [ ] `components/KanbanBoard.tsx`: add `keydown` handler on `window` for `?` key that sets `showShortcuts(true)`, guarded so it does not fire when the event target is an input, textarea, or has `contenteditable`.
- [ ] `components/KanbanBoard.tsx`: add a `?` help button in the board header that opens the shortcuts modal.
- [ ] `components/KanbanBoard.tsx`: render `<ShortcutsModal onClose={() => setShowShortcuts(false)} />` when `showShortcuts` is true.

## Tests

- [ ] `backend/tests/test_board.py`: 4 new tests for `wipLimit` and `collapsed` round-trips (74 backend tests total).
- [ ] `frontend/src/components/KanbanBoard.test.tsx`: test that setting a WIP limit calls `saveBoard` with the updated limit.
- [ ] `frontend/src/components/KanbanBoard.test.tsx`: test that toggling column collapse calls `saveBoard`.
- [ ] `frontend/src/components/KanbanBoard.test.tsx`: test that the `?` key opens the shortcuts modal.
- [ ] `frontend/src/components/KanbanBoard.test.tsx`: test that the help button opens the shortcuts modal.
- [ ] `frontend/src/components/ShortcutsModal.test.tsx` (new): test that the modal renders shortcut rows, Escape closes it, and backdrop click closes it.

## Final Verification

- [ ] ESLint: 0 errors, 0 warnings.
- [ ] TypeScript build: succeeds with no type errors (`npm run build`).
- [ ] Backend tests: 74 passing (`uv run pytest`).
- [ ] Frontend tests: 57+ passing (`npm run test:unit`).
