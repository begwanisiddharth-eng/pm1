# Backend Instructions

## Current Shape

The backend is a local FastAPI app managed with `uv`.

Key files:
- `pyproject.toml` defines Python dependencies and pytest configuration.
- `app/main.py` contains the FastAPI app.
- `app/static/index.html` is temporary static HTML for Part 2.
- `tests/test_main.py` contains smoke tests for the health endpoint and temporary HTML.

## Commands

Run from `backend/`:

- `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`
- `uv run pytest`

## Implementation Notes

- Do not use Docker.
- Keep API routes under `/api`.
- FastAPI should serve the frontend at `/`.
- Keep OpenAI API keys server-side only.
- Keep backend behavior simple and local-first for the MVP.
