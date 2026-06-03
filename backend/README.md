# Backend

Local FastAPI backend for the Project Management MVP.

Run from this directory:

```powershell
$env:UV_CACHE_DIR = "..\.uv-cache"
$env:UV_LINK_MODE = "copy"
uv sync
.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Tests:

```powershell
$env:UV_CACHE_DIR = "..\.uv-cache"
$env:UV_LINK_MODE = "copy"
uv run pytest
```
