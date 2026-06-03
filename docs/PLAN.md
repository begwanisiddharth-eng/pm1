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

## Public API Summary

Planned backend routes:

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
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
