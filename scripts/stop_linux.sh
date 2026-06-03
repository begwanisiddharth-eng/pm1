#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT/.server.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "No PID file found. Server is not running from these scripts."
  exit 0
fi

PID="$(cat "$PID_FILE")"
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "Stopped server with PID $PID"
else
  echo "No running process found for PID $PID"
fi

rm -f "$PID_FILE"
