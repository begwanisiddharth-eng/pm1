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
