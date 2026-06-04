# Project Plan

This plan describes the work required to turn the existing frontend-only Kanban demo into a local Project Management MVP with a FastAPI backend, SQLite persistence, sign in, and an OpenAI-powered AI sidebar.

The project must run locally without Docker. Use `uv` for Python dependency management, keep the implementation simple, and do not add features outside the MVP.

## Part 1: Plan

### Goal

Create clear working documentation before implementation begins.

### Checklist

- [x] Update the root `AGENTS.md` file to remove Docker requirements and use OpenAI.
- [x] Expand this `docs/PLAN.md` file with detailed steps, tests, and success criteria.
- [x] Create `docs/ToDos.md` as the live checklist for future work.
- [x] Create `frontend/AGENTS.md` describing the existing frontend structure and conventions.
- [x] Review the updated plan with the user before starting application code.

### Tests

- Read `AGENTS.md` and confirm there are no Docker or OpenRouter requirements.
- Read `docs/PLAN.md` and confirm every part has a goal, checklist, tests, and success criteria.
- Read `docs/ToDos.md` and confirm all 10 parts are represented.

### Success Criteria

- Documentation is detailed enough for an agent or engineer to start implementation without making architectural decisions.
- The plan clearly states that the project is local-only and does not use Docker.
- The plan clearly states that AI calls use OpenAI, `OPENAI_API_KEY`, `gpt-4o-mini`, and Structured Outputs.

## Part 2: Local Scaffolding

### Goal

Create the local backend foundation and scripts needed to run the app without Docker.

### Checklist

- [x] Set up a FastAPI backend in `backend/`.
- [x] Add Python project configuration using `uv`.
- [x] Add a minimal FastAPI app entrypoint.
- [x] Add a health endpoint at `/api/health`.
- [x] Configure FastAPI to serve static files at `/`.
- [x] Add temporary static HTML so `/` can prove local serving works before the real frontend is connected.
- [x] Add start and stop scripts for Windows, macOS, and Linux in `scripts/`.
- [x] Update backend and scripts documentation files if needed.

### Tests

- Add backend tests for `/api/health`.
- Run the backend locally through the start script.
- Confirm `/` returns HTML.
- Confirm `/api/health` returns JSON.
- Confirm the stop script stops the local server process.

### Success Criteria

- The backend can be started locally without Docker.
- The backend serves both a temporary frontend page and an API route.
- Start and stop scripts work on the intended operating systems or have clearly documented commands.

## Part 3: Add Existing Frontend

### Goal

Serve the existing NextJS Kanban frontend through FastAPI.

### Checklist

- [ ] Review the current frontend structure and create `frontend/AGENTS.md`.
- [ ] Configure the NextJS frontend for static export.
- [ ] Add a frontend build step that outputs static files.
- [ ] Configure FastAPI to serve the built frontend at `/`.
- [ ] Preserve the existing Kanban board behavior.
- [ ] Keep the current color scheme and visual direction.

### Tests

- Run frontend unit tests.
- Run frontend Playwright tests.
- Run backend/static serving smoke tests.
- Confirm the Kanban board loads from the FastAPI-served root path.

### Success Criteria

- The existing Kanban board appears at `/`.
- Existing column rename, add card, delete card, and drag/drop behavior still works.
- The app is served locally through FastAPI.

## Part 4: Fake User Sign-In Experience

### Goal

Add MVP authentication with one hardcoded account.

### Checklist

- [ ] Add backend login endpoint for `user` and `password`.
- [ ] Add backend logout endpoint.
- [ ] Add backend current-user endpoint.
- [ ] Use a simple local cookie session.
- [ ] Add a frontend login screen shown before the Kanban board.
- [ ] Add logout in the signed-in UI.
- [ ] Protect board and AI API routes from unauthenticated access.

### Tests

- Backend tests for successful login.
- Backend tests for failed login.
- Backend tests for current-user session lookup.
- Backend tests for logout.
- Frontend tests for login form behavior.
- Playwright tests for login, failed login, board access, and logout.

### Success Criteria

- Users must sign in before seeing the Kanban board.
- `user` and `password` signs in successfully.
- Invalid credentials fail clearly.
- Logout returns the user to the login screen.

## Part 5: Database Modeling

### Goal

Document and approve the SQLite data model before implementing persistence.

### Checklist

- [ ] Create a database design document in `docs/`.
- [ ] Define a `users` table that supports future multiple users.
- [ ] Define a `boards` table that stores one board per user for the MVP.
- [ ] Store board content as JSON.
- [ ] Use the current frontend `BoardData` shape as the stored board shape.
- [ ] Define the default seeded MVP user and board.
- [ ] Get user approval before implementing the schema.

### Tests

- Review schema against MVP requirements.
- Confirm the schema supports one board per signed-in user.
- Confirm the schema can support multiple users later without redesigning the MVP.
- Confirm stored JSON can represent columns, card order, card titles, and card details.

### Success Criteria

- The database approach is documented and approved.
- The schema is simple and sufficient for the MVP.
- The stored board JSON is compatible with the frontend data model.

## Part 6: Backend Board API

### Goal

Implement backend persistence for reading and changing a signed-in user's Kanban board.

### Checklist

- [ ] Initialize the SQLite database automatically if it does not exist.
- [ ] Seed the MVP user if missing.
- [ ] Seed the MVP board if missing.
- [ ] Add `GET /api/board`.
- [ ] Add `PUT /api/board`.
- [ ] Require an authenticated cookie session for board routes.
- [ ] Validate incoming board JSON before saving.
- [ ] Return clear errors for unauthenticated or invalid requests.

### Tests

- Backend tests for database creation.
- Backend tests for user and board seeding.
- Backend tests for authenticated board read.
- Backend tests for authenticated board update.
- Backend tests for unauthenticated rejection.
- Backend tests for invalid board JSON rejection.

### Success Criteria

- The database is created automatically when missing.
- The signed-in user can read and update their board.
- Board changes persist across backend restarts.
- Invalid board data does not corrupt the saved board.

## Part 7: Frontend + Backend

### Goal

Connect the frontend Kanban board to the backend API so the board is persistent. Also add card editing (inline edit of card title and details).

### Checklist

- [ ] Load the board from `GET /api/board` after sign in.
- [ ] Save board changes through `PUT /api/board`.
- [ ] Preserve existing drag/drop, rename, add, and delete workflows.
- [ ] Add card editing: clicking a card opens an inline edit form for title and details.
- [ ] Save card edits through `PUT /api/board`.
- [ ] Add simple loading state while the board is fetched.
- [ ] Add simple error state when the board cannot be loaded or saved.
- [ ] Keep the UI focused on the board, not on backend mechanics.

### Tests

- Frontend unit tests with mocked board API responses.
- Frontend unit tests for card edit form behavior.
- Playwright tests for login and board load.
- Playwright tests for board edits persisting after reload.
- Playwright tests for add, delete, rename, drag/drop, and card edit with backend persistence.
- Backend tests from Part 6 remain passing.

### Success Criteria

- The board is loaded from SQLite through the backend.
- User edits persist after page reload.
- Cards can be edited inline; edits persist after reload.
- The existing frontend experience remains intact.

## Part 8: AI Connectivity

### Goal

Prove the backend can call OpenAI successfully.

### Checklist

- [ ] Add the OpenAI Python SDK.
- [ ] Load `OPENAI_API_KEY` from `.env` in the project root.
- [ ] Configure the model as `gpt-4o-mini`.
- [ ] Add a backend AI service module.
- [ ] Add a simple AI connectivity test path or script that asks a basic `2+2` question.
- [ ] Keep the API key server-side only.

### Tests

- Backend unit tests with the OpenAI client mocked.
- Manual or gated integration test with the real API key for `2+2`.
- Test missing API key behavior.

### Success Criteria

- The backend can make a successful OpenAI call when the API key exists.
- The frontend never receives or stores the API key.
- Missing configuration fails clearly.

## Part 9: AI Structured Board Updates

### Goal

Allow AI to respond to user chat and optionally update the Kanban board.

### Checklist

- [ ] Add `POST /api/ai/chat`.
- [ ] Require authentication for AI chat.
- [ ] Send the user's message, conversation history, and current board JSON to OpenAI.
- [ ] Use Structured Outputs for the AI response.
- [ ] Require the AI response to include a user-facing message.
- [ ] Allow the AI response to optionally include a complete updated board JSON.
- [ ] Validate any returned board before saving it.
- [ ] Save the updated board only if validation passes.
- [ ] Return the assistant message and current board state to the frontend.

### Tests

- Backend tests for message-only AI responses.
- Backend tests for valid AI board updates.
- Backend tests for invalid AI board updates.
- Backend tests proving invalid AI output does not overwrite the saved board.
- Backend tests for unauthenticated AI chat rejection.

### Success Criteria

- AI can reply without changing the board.
- AI can create, edit, move, or delete cards by returning a valid updated board.
- AI can rename columns by returning a valid updated board.
- Invalid AI board output is rejected safely.

## Part 10: AI Sidebar UI

### Goal

Add a polished AI chat sidebar to the Kanban UI.

### Checklist

- [ ] Add an AI sidebar to the signed-in board screen.
- [ ] Display conversation history.
- [ ] Add a chat input and send button.
- [ ] Send messages to `POST /api/ai/chat`.
- [ ] Show loading state while waiting for AI.
- [ ] Show backend or AI errors clearly but simply.
- [ ] Apply returned board updates automatically.
- [ ] Refresh the board UI after AI changes.
- [ ] Keep the sidebar visually consistent with the existing color scheme.

### Tests

- Frontend unit tests for chat rendering.
- Frontend unit tests for sending messages.
- Frontend unit tests for loading and error states.
- Frontend tests proving returned board updates refresh the Kanban state.
- Playwright test for a mocked AI chat response.
- Manual integration test with real OpenAI after backend work is complete.

### Success Criteria

- The user can chat with AI from the board screen.
- AI responses appear in the sidebar.
- Valid AI board updates appear on the Kanban board automatically.
- The app remains usable when AI fails.

## Part 12: Column Reordering, Card Checklists, and Board Stats

### Goal

Deepen the PM experience with three targeted improvements:
1. Columns can be reordered by drag-and-drop (same dnd-kit setup, new sensor target).
2. Cards gain a checklist field — ordered sub-items with done/undone state, editable inline.
3. A compact stats row in the board header shows live counts: total cards, overdue, checklist completion.

### Checklist

- [ ] Backend: add `checklist: list[ChecklistItem]` to `Card` model (default `[]`).
- [ ] Backend: `ChecklistItem` Pydantic model (`id: str`, `text: str`, `done: bool`).
- [ ] Backend: preserve `checklist` in AI board merges (alongside priority, due_date, labels).
- [ ] Backend: add tests for checklist round-trip and default empty list.
- [ ] Frontend `kanban.ts`: add `ChecklistItem` type and `checklist?: ChecklistItem[]` to `Card`.
- [ ] Frontend `kanban.ts`: add `moveColumn` helper (reorders `columns` array).
- [ ] Frontend `KanbanBoard.tsx`: support column drag-and-drop using a second `SortableContext`
  wrapping the column list; `handleDragEnd` distinguishes card vs column moves.
- [ ] Frontend `KanbanCard.tsx`: checklist section in edit mode (add item, toggle done, remove item).
- [ ] Frontend `KanbanCard.tsx`: checklist progress chip in view mode (e.g. "2 / 4").
- [ ] Frontend `BoardStats.tsx`: new component showing total cards, overdue count, checklist progress across board.
- [ ] Frontend `KanbanBoard.tsx`: render `BoardStats` in the header area.
- [ ] Frontend tests: `moveColumn` unit tests; checklist interaction tests in `KanbanBoard.test.tsx`.
- [ ] Backend tests: 55+ passing; frontend tests: 27+ passing; ESLint clean; build succeeds.

### Tests

- Backend: PUT board with checklist items returns them correctly.
- Backend: checklist defaults to `[]` when omitted.
- Backend: AI merge preserves checklist from existing board.
- Frontend: `moveColumn` reorders columns correctly.
- Frontend: adding a checklist item and toggling it done calls `saveBoard`.
- Frontend: board stats show correct counts.

### Success Criteria

- Users can drag columns to reorder them; order persists to backend.
- Cards can have checklist items; done state persists.
- Board header shows accurate live stats.
- All existing tests continue to pass.

## Part 13: Card Archive, Board Description, and Card Move-to-Column

### Goal

Three targeted PM improvements:
1. Cards can be archived instead of deleted; an archive panel lets users view and restore them.
2. Boards can have a description (editable inline); stored in the board's JSON.
3. A "Move to..." dropdown on each card lets users move it to any other column without dragging.

### Checklist

- [ ] Backend: extend `BoardData` to allow `description?: str | None` and `archivedCardIds?: list[str]`.
- [ ] Backend: extend `Card` to allow `archived?: bool` (default `False`).
- [ ] Backend: archived cards are not sent to AI (filter from board JSON before AI call).
- [ ] Backend: add tests for archive round-trip (save archived card, restore it).
- [ ] Frontend `kanban.ts`: add `archived?` to `Card`, `archivedCardIds?` and `description?` to `BoardData`.
- [ ] Frontend `KanbanCard.tsx`: replace "Remove" with "Archive" in view mode (soft delete).
- [ ] Frontend `KanbanBoard.tsx`: `handleArchiveCard` removes card from column `cardIds` and adds to `archivedCardIds`; `handleRestoreCard` reverses it.
- [ ] Frontend `ArchivePanel.tsx`: collapsible panel showing archived cards; Restore and Delete buttons per card; shown below the board or in a toggle.
- [ ] Frontend `KanbanBoard.tsx`: add board description below title; click to edit inline.
- [ ] Frontend `KanbanCard.tsx`: add "Move to..." dropdown (columns excluding current); selecting moves the card.
- [ ] Frontend tests: archive/restore unit tests; board description save test; move-to test.
- [ ] ESLint clean; build succeeds; all prior tests still passing.

### Tests

- Backend: PUT board with archived card round-trips correctly.
- Backend: `archivedCardIds` defaults to `[]` when omitted.
- Frontend: archiving a card removes it from its column and adds to archive panel.
- Frontend: restoring a card from archive puts it back in its original column's end.
- Frontend: board description saves on blur.
- Frontend: move-to dropdown moves card to selected column.

### Success Criteria

- Archived cards are hidden from the board but recoverable.
- Board description is editable and persists.
- Cards can be moved between columns without drag-and-drop.
- All existing tests continue to pass.

## Part 14: Password Change, Keyboard Shortcuts, and Overdue Highlighting

### Goal

Three targeted UX and user management improvements:
1. Users can change their password from a profile dropdown in the board header.
2. Keyboard shortcuts: Escape cancels any edit/form, Enter saves in single-line inline forms.
3. Overdue cards are visually highlighted with a red left border and red due-date chip.

### Checklist

- [ ] Backend: add `PATCH /api/auth/password` — accepts `current_password` and `new_password`; validates current, rejects if wrong; enforces min-length 6 on new; updates hash in DB.
- [ ] Backend: add tests for password change (success, wrong current password, too-short new password, unauthenticated).
- [ ] Frontend `lib/api.ts`: add `changePassword(currentPassword, newPassword)` fetch call.
- [ ] Frontend `ChangePasswordModal.tsx`: modal with current-password field, new-password field, confirm-password field; inline validation; calls `changePassword`; shows success message then closes.
- [ ] Frontend `KanbanBoard.tsx`: profile dropdown button in header (username initial); opens ChangePasswordModal on "Change password" click; "Sign out" also in dropdown.
- [ ] Frontend `KanbanCard.tsx`: pressing Escape in edit mode cancels (same as clicking Cancel); pressing Enter in title field saves if title is not empty.
- [ ] Frontend `NewCardForm.tsx`: pressing Escape closes the form; pressing Enter in title submits (if not empty).
- [ ] Frontend `AddColumnForm.tsx`: pressing Escape closes the form; pressing Enter submits.
- [ ] Frontend `KanbanCard.tsx`: add overdue detection — if `due_date` is set and before today, apply red left border and red color to the due-date chip.
- [ ] Frontend tests: ChangePasswordModal renders and submits; keyboard shortcut tests for KanbanCard edit.
- [ ] Backend tests: 66+ passing; frontend tests: 35+ passing; ESLint clean; build succeeds.

### Tests

- Backend: PATCH /api/auth/password with correct current password updates successfully.
- Backend: PATCH /api/auth/password with wrong current password returns 400.
- Backend: PATCH /api/auth/password with new password < 6 chars returns 422.
- Backend: unauthenticated PATCH /api/auth/password returns 401.
- Frontend: ChangePasswordModal shows validation error when passwords don't match.
- Frontend: Escape key in card edit mode cancels the edit.
- Frontend: overdue card shows red styling on due-date chip.

### Success Criteria

- Users can change their password without logging out.
- Keyboard-only users can dismiss modals and submit forms efficiently.
- Overdue cards are immediately obvious on the board.
- All existing tests continue to pass.

## Part 15: Card Duplication, AI Clear Chat, and Column Empty State (Iteration 7)

### Goal

Three targeted UX improvements:
1. Cards can be duplicated with a single click; the clone appears directly below the original.
2. The AI sidebar has a "Clear chat" button that resets the local conversation history.
3. Column headers show a card count badge; zero-card columns show an empty-state prompt.

### Checklist

- [ ] Frontend `KanbanBoard.tsx`: add `handleDuplicateCard(cardId, columnId)` — creates a new card with a new ID, title "Copy of <original>", same metadata (priority, due_date, labels, checklist), inserts immediately after the original in the column's `cardIds`, then calls `persist`.
- [ ] Frontend `KanbanCard.tsx`: add a "Duplicate" button in view mode; passes `onDuplicate` prop up.
- [ ] Frontend `KanbanColumn.tsx`: show card count badge (visible cards count) in column header.
- [ ] Frontend `KanbanColumn.tsx`: show empty-state prompt ("No cards yet. Add one below.") when column has zero visible cards.
- [ ] Frontend `AISidebar.tsx`: add "Clear chat" button; clicking clears local `messages` state.
- [ ] Frontend tests: duplicate card test in `KanbanBoard.test.tsx`; clear chat test; column empty state and badge tests.
- [ ] ESLint clean; build succeeds; all prior tests still passing (66 backend, 39+ frontend).

### Tests

- Frontend: duplicating a card creates a new card titled "Copy of <title>" positioned after the original in the same column.
- Frontend: clearing chat empties the message list in AISidebar.
- Frontend: column with no visible cards shows empty state text.
- Frontend: column with cards shows the correct card count badge.

### Success Criteria

- Card duplication works and persists to backend.
- AI chat history can be cleared without affecting the board.
- Empty columns have a clear visual prompt.
- All existing tests continue to pass.

## Part 16: Card Comments, Card Color Accents, and Board Export (Iteration 8)

### Goal

Three targeted PM improvements:
1. Cards can have timestamped text comments stored in the card JSON; visible in view mode and editable in the edit panel.
2. Cards can be assigned an accent color (one of several presets) for visual grouping; the color shows as a top border strip on the card.
3. The board can be exported to a JSON file via a button in the board header.

### Checklist

- [ ] Backend: add `color?: str | None = None` to `Card` model.
- [ ] Backend: add `comments?: list[Comment] = []` to `Card` model; `Comment` Pydantic model (`id: str`, `text: str`, `created_at: str`).
- [ ] Backend: preserve `color` and `comments` in AI board merges.
- [ ] Backend: add round-trip tests for color and comments (2 tests).
- [ ] Frontend `kanban.ts`: add `color?: string | null` and `comments?: Comment[]` to `Card`; add `Comment` type.
- [ ] Frontend `KanbanCard.tsx`: show accent color strip (top border or top colored band) in view mode; add color picker in edit mode (6 preset swatches + "None").
- [ ] Frontend `KanbanCard.tsx`: show comment count chip in view mode ("2 comments"); show comment list in edit mode (add comment textarea + submit button; each comment shows text and timestamp).
- [ ] Frontend `KanbanBoard.tsx`: add "Export JSON" button in board header; clicking triggers a browser download of the current board JSON.
- [ ] Frontend tests: color picker test; add comment test; export JSON test (verify download triggered).
- [ ] ESLint clean; build succeeds; all prior tests still passing (66 backend, 41+ frontend).

### Tests

- Backend: PUT board with `color` and `comments` round-trips correctly.
- Backend: AI merge preserves existing color and comments.
- Frontend: selecting an accent color saves and shows on the card.
- Frontend: adding a comment shows it in edit mode with timestamp.
- Frontend: Export JSON button triggers a file download.

### Success Criteria

- Cards can be color-coded; color persists to backend.
- Cards can have comments; comments persist to backend.
- Board can be exported as a downloadable JSON file.
- All existing tests continue to pass.

## Part 17: Board Import, Search Highlight, and Last-Updated Timestamps (Iteration 9)

### Goal

Three targeted improvements:
1. Users can import a JSON file to replace the current board's content; requires confirmation before overwriting.
2. When a text search filter is active, matching substrings in card titles and details are highlighted.
3. The board selector and board header show a human-readable "last updated" time (e.g. "2 hours ago").

### Checklist

- [ ] Frontend `KanbanBoard.tsx`: "Import JSON" button (hidden file input); on file select, parse JSON, validate it looks like a BoardData, prompt confirmation, then call `saveBoard` with the imported data and refresh.
- [ ] Frontend `KanbanCard.tsx`: add `HighlightText` helper that wraps matches in a `<mark>` element; use it for card title and details when `filter.search` is non-empty.
- [ ] Frontend `KanbanColumn.tsx`: pass `filter.search` to each card via a new `searchQuery` prop, or use the existing `filter` prop already available.
- [ ] Frontend `BoardSelector.tsx`: show `updated_at` as a relative time string (e.g. "3 days ago") under each board name.
- [ ] Frontend `KanbanBoard.tsx`: show `updated_at` as a relative time string in the board header subtitle area; refresh after each save.
- [ ] Frontend `lib/kanban.ts`: add `timeAgo(isoString)` utility.
- [ ] Frontend tests: highlight test (HighlightText renders marks); import JSON test; timeAgo unit tests.
- [ ] ESLint clean; build succeeds; all prior tests still passing.

### Tests

- Frontend: `timeAgo` returns "just now" for recent dates, "X minutes ago", "X hours ago", "X days ago".
- Frontend: HighlightText wraps matching substring in a mark element.
- Frontend: import JSON button triggers file input, validates, and calls saveBoard on confirmation.

### Success Criteria

- Board JSON can be imported; invalid JSON is rejected gracefully.
- Search highlights make matches easy to spot.
- Board ages are human-readable throughout the app.
- All existing tests continue to pass.

## Public API Summary

Planned backend routes:

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/password`
- `GET /api/board`
- `PUT /api/board`
- `POST /api/ai/chat`

## Key Assumptions

- Do not use Docker.
- Use local scripts for running and stopping the app.
- Use `uv` for Python dependency management.
- Use OpenAI with `OPENAI_API_KEY` and `gpt-4o-mini`.
- Use Structured Outputs for AI responses that may update the board.
- Use SQLite for local persistence.
- Keep one board per signed-in user for the MVP.
- Do not add registration, multiple boards, deployments, advanced permissions, or approval-before-apply AI workflows unless explicitly requested later.
