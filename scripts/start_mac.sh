#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
PID_FILE="$ROOT/.server.pid"
export UV_CACHE_DIR="$ROOT/.uv-cache"
export UV_LINK_MODE=copy

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Server already running with PID $(cat "$PID_FILE")"
  exit 0
fi

cd "$ROOT/frontend"
npm install
npm run build

cd "$BACKEND"
uv sync
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
echo "$!" > "$PID_FILE"
echo "Server started at http://127.0.0.1:8000 with PID $(cat "$PID_FILE")"
