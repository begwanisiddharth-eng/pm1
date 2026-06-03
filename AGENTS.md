# The Project Management MVP web app

## Business Requirements

This project is building a Project Management App. Key features:
- A user can sign in
- When signed in, the user sees a Kanban board representing their project
- The Kanban board has fixed columns that can be renamed
- The cards on the Kanban board can be moved with drag and drop, and edited
- There is an AI chat feature in a sidebar; the AI is able to create, edit, and move one or more cards

## Limitations

For the MVP, there will only be one sign in account, hardcoded to `user` and `password`, but the database will support multiple users for future work.

For the MVP, there will only be one Kanban board per signed-in user.

For the MVP, this will run locally. Do not use Docker or container infrastructure for this project unless the user explicitly changes this requirement later.

## Technical Decisions

- NextJS frontend
- Python FastAPI backend, including serving the static NextJS site at `/`
- Local development and runtime only; no Docker
- Use `uv` for Python dependency management
- Use OpenAI for AI calls
- Read `OPENAI_API_KEY` from `.env` in the project root
- Use `gpt-4o-mini` as the model
- Use OpenAI Structured Outputs for AI responses that may update the Kanban board
- Use a local SQLite database, creating a new database if it does not exist
- Start and stop server scripts for Mac, PC, and Linux in `scripts/`

## Starting Point

A working MVP of the frontend has been built and is already in `frontend/`. It is currently a pure frontend-only demo and needs to be connected to the local FastAPI backend.

## Color Scheme

- Accent Yellow: `#ecad0a` - accent lines, highlights
- Blue Primary: `#209dd7` - links, key sections
- Purple Secondary: `#753991` - submit buttons, important actions
- Dark Navy: `#032147` - main headings
- Gray Text: `#888888` - supporting text, labels

## Coding Standards

1. Use latest versions of libraries and idiomatic approaches as of today.
2. Keep it simple. Never over-engineer. Always simplify. No unnecessary defensive programming. No extra features.
3. Be concise. Keep README minimal. No emojis ever.
4. When hitting issues, always identify root cause before trying a fix. Do not guess. Prove with evidence, then fix the root cause.
5. Do not start implementation work until the relevant planning documentation is updated and approved.

## Working Documentation

All documents for planning and executing this project will be in the `docs/` directory.
Review `docs/PLAN.md` and `docs/ToDos.md` before proceeding with implementation work.
