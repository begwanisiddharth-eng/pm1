# ToDos

This file tracks the work required to complete the Project Management MVP. Mark items complete as they are finished.

## Part 1: Planning

- [x] Update root `AGENTS.md` for local non-Docker OpenAI setup.
- [x] Expand `docs/PLAN.md` with detailed checklists, tests, and success criteria.
- [x] Create `docs/ToDos.md`.
- [x] Create `frontend/AGENTS.md` describing the existing frontend.
- [x] Ask the user to review and approve the plan before application code begins.

## Part 2: Local Scaffolding

- [x] Set up FastAPI backend in `backend/`.
- [x] Add Python project configuration using `uv`.
- [x] Add FastAPI app entrypoint.
- [x] Add `/api/health`.
- [x] Configure static file serving at `/`.
- [x] Add temporary static HTML for the first backend smoke test.
- [x] Add Windows start script.
- [x] Add Windows stop script.
- [x] Add macOS start script.
- [x] Add macOS stop script.
- [x] Add Linux start script.
- [x] Add Linux stop script.
- [x] Add backend smoke tests.

## Part 3: Add Existing Frontend

- [x] Review existing frontend structure.
- [x] Configure NextJS static export.
- [x] Add frontend build step.
- [x] Serve built frontend through FastAPI.
- [x] Confirm Kanban board loads at `/`.
- [x] Run frontend unit tests.
- [x] Run frontend Playwright tests.
- [x] Run backend static-serving smoke test.

## Part 4: Fake User Sign-In Experience

- [x] Add backend login endpoint.
- [x] Add backend logout endpoint.
- [x] Add backend current-user endpoint.
- [x] Implement local cookie session.
- [x] Add frontend login screen.
- [x] Add frontend logout action.
- [x] Protect board API routes.
- [x] Protect AI API routes.
- [x] Add backend auth tests.
- [x] Add frontend auth tests.
- [x] Add Playwright auth tests.

## Part 5: Database Modeling

- [x] Create database design document in `docs/`.
- [x] Define `users` table.
- [x] Define `boards` table.
- [x] Define board JSON shape.
- [x] Define default MVP user seed.
- [x] Define default MVP board seed.
- [x] Ask user to approve database design.

## Part 6: Backend Board API

- [x] Add SQLite initialization.
- [x] Add MVP user seeding.
- [x] Add MVP board seeding.
- [x] Add `GET /api/board`.
- [x] Add `PUT /api/board`.
- [x] Require authentication for board routes.
- [x] Validate board JSON before saving.
- [x] Add backend database tests.
- [x] Add backend board API tests.

## Part 7: Frontend + Backend

- [x] Load board from backend after sign in.
- [x] Save board changes to backend.
- [x] Preserve column rename workflow.
- [x] Preserve add card workflow.
- [x] Preserve delete card workflow.
- [x] Preserve drag/drop workflow.
- [x] Add card editing (inline edit of title and details).
- [x] Add board loading state.
- [x] Add board error state.
- [x] Add frontend API integration tests.
- [x] Add frontend card edit tests.
- [x] Add Playwright persistence tests.

## Part 8: AI Connectivity

- [x] Add OpenAI Python SDK.
- [x] Load `OPENAI_API_KEY` from project root `.env`.
- [x] Configure model as `gpt-4o-mini`.
- [x] Add backend AI service module.
- [x] Add mocked backend AI tests.
- [x] Add manual or gated `2+2` OpenAI connectivity test.
- [x] Confirm API key is never exposed to frontend.

## Part 9: AI Structured Board Updates

- [x] Add `POST /api/ai/chat`.
- [x] Send user message to OpenAI.
- [x] Send conversation history to OpenAI.
- [x] Send current board JSON to OpenAI.
- [x] Use Structured Outputs.
- [x] Require assistant message in AI response.
- [x] Allow optional complete updated board JSON in AI response.
- [x] Validate AI board output before saving.
- [x] Save valid AI board updates.
- [x] Reject invalid AI board updates without corrupting saved board.
- [x] Add backend AI chat tests.

## Part 10: AI Sidebar UI

- [x] Add AI sidebar to board screen.
- [x] Display conversation history.
- [x] Add chat input.
- [x] Add send button.
- [x] Connect sidebar to `POST /api/ai/chat`.
- [x] Show AI loading state.
- [x] Show AI error state.
- [x] Apply returned board updates automatically.
- [x] Refresh board UI after AI changes.
- [x] Add frontend AI sidebar tests.
- [x] Add Playwright AI sidebar test with mocked backend.
- [x] Run manual integration test with real OpenAI.

## Part 11: User Management & Multiple Boards

- [x] Add password hashing to users table (`pbkdf2:sha256`).
- [x] Add database migration for existing databases (password_hash, board name columns).
- [x] Update login to verify hashed password from database.
- [x] Add `POST /api/auth/register` endpoint (username + password, min lengths enforced).
- [x] Registration creates an initial "My Board" for new users.
- [x] Add registration form to LoginForm component (toggle between sign-in and create account).
- [x] Add `name` column to boards table.
- [x] Add `GET /api/boards` — list user's boards (id, name, updated_at).
- [x] Add `POST /api/boards` — create a new named board.
- [x] Add `GET /api/boards/{board_id}` — get board content (auth + ownership enforced).
- [x] Add `PUT /api/boards/{board_id}` — update board content.
- [x] Add `PATCH /api/boards/{board_id}/name` — rename a board.
- [x] Add `DELETE /api/boards/{board_id}` — delete board (blocked if it's the user's only board).
- [x] Update `POST /api/ai/chat` to accept `board_id` (verified against current user).
- [x] Add BoardSelector component (shows board list, create-board flow).
- [x] Update page.tsx for board-selection phase (auto-selects if one board, shows selector if multiple).
- [x] Update KanbanBoard — inline board rename, delete board with confirmation, "All boards" back button.
- [x] Update AISidebar to accept and pass `boardId` to chat API.
- [x] Cross-user board isolation enforced (ownership check on all board routes).
- [x] Add comprehensive backend tests for all new routes (48 passing).
- [x] Update frontend tests for new API signatures (19 passing).
- [x] ESLint clean (0 errors, 0 warnings).
- [x] Frontend builds successfully with TypeScript.

## Part 12: Card Labels, Filters, Column Reordering, Checklists, and Board Stats

### Completed (Iteration 3)

- [x] Add `labels: list[str] = []` to backend `Card` model.
- [x] Preserve `labels` in AI board merges alongside priority and due_date.
- [x] Add backend label round-trip tests (saved, returned, defaults to `[]`).
- [x] Add `labels?: string[]` to frontend `Card` type in `kanban.ts`.
- [x] Add `LABEL_OPTIONS` constant (6 predefined labels with Tailwind colors).
- [x] Add `CardFilter` type and `matchesFilter` helper to `kanban.ts`.
- [x] Update `KanbanCard` edit mode: label multi-select (toggle chips).
- [x] Update `KanbanCard` view mode: label chips displayed below priority/due-date.
- [x] Create `FilterBar` component: search input, priority chips, overdue toggle, clear button.
- [x] Wire filter state into `KanbanBoard`; pass `filter` prop to each `KanbanColumn`.
- [x] Apply `matchesFilter` in `KanbanColumn` to show only matching cards.
- [x] Add 8 `matchesFilter` unit tests to `kanban.test.ts`.
- [x] ESLint clean; build succeeds; 55 backend + 27 frontend tests passing.

### Iteration 4 (completed)

- [x] Backend: add `ChecklistItem` Pydantic model (`id`, `text`, `done`).
- [x] Backend: add `checklist: list[ChecklistItem] = []` to `Card` model.
- [x] Backend: preserve `checklist` in AI board merges.
- [x] Backend: add checklist round-trip tests and default-empty-list test (58 backend tests passing).
- [x] Frontend `kanban.ts`: add `ChecklistItem` type and `checklist?` to `Card`.
- [x] Frontend `kanban.ts`: add `moveColumn` helper.
- [x] Frontend `KanbanBoard.tsx`: column drag-and-drop reordering via `SortableContext` + `horizontalListSortingStrategy`; `handleDragEnd` distinguishes card vs column moves.
- [x] Frontend `KanbanColumn.tsx`: replaced `useDroppable` with `useSortable`; yellow pill is the drag handle.
- [x] Frontend `KanbanCard.tsx`: checklist section in edit mode (add item, toggle done, remove item).
- [x] Frontend `KanbanCard.tsx`: checklist progress chip in view mode (e.g. "2 / 4", green when all done).
- [x] Frontend `BoardStats.tsx`: new component — total cards, overdue count, checklist completion.
- [x] Frontend `KanbanBoard.tsx`: render `BoardStats` in board header; import `BoardStats`.
- [x] Frontend tests: 4 `moveColumn` unit tests; checklist field in edit assertion; 58 backend + 31 frontend passing.
- [x] ESLint clean; build succeeds.
