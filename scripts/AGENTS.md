# Scripts Instructions

This folder contains local start and stop scripts for the MVP server.

## Files

- `start_windows.ps1` starts the FastAPI backend on Windows.
- `stop_windows.ps1` stops the FastAPI backend on Windows.
- `start_mac.sh` starts the FastAPI backend on macOS.
- `stop_mac.sh` stops the FastAPI backend on macOS.
- `start_linux.sh` starts the FastAPI backend on Linux.
- `stop_linux.sh` stops the FastAPI backend on Linux.

## Behavior

- Scripts run the backend from `backend/`.
- The server listens at `http://127.0.0.1:8000`.
- Start scripts write the process ID to `.server.pid` in the project root.
- Stop scripts read `.server.pid` and stop that process.

## Implementation Notes

- Do not add Docker commands.
- Keep scripts simple and local.
- Update these instructions if script names or server ports change.
