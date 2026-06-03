$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Backend = Join-Path $Root "backend"
$PidFile = Join-Path $Root ".server.pid"
$LogFile = Join-Path $Root "server.log"
$ErrorLogFile = Join-Path $Root "server.error.log"
$env:UV_CACHE_DIR = Join-Path $Root ".uv-cache"
$env:UV_LINK_MODE = "copy"

if (Test-Path $PidFile) {
    $ExistingPid = Get-Content $PidFile -ErrorAction SilentlyContinue
    if ($ExistingPid -and (Get-Process -Id $ExistingPid -ErrorAction SilentlyContinue)) {
        Write-Host "Server already running with PID $ExistingPid"
        exit 0
    }
}

$Frontend = Join-Path $Root "frontend"
Push-Location $Frontend
npm install
npm run build
Pop-Location

Push-Location $Backend
uv sync
Pop-Location

$Python = Join-Path $Backend ".venv\Scripts\python.exe"

$Process = Start-Process `
    -FilePath $Python `
    -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000") `
    -WorkingDirectory $Backend `
    -RedirectStandardOutput $LogFile `
    -RedirectStandardError $ErrorLogFile `
    -PassThru `
    -WindowStyle Hidden

$Process.Id | Set-Content $PidFile
Write-Host "Server started at http://127.0.0.1:8000 with PID $($Process.Id)"
