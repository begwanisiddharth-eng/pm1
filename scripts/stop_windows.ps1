$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$PidFile = Join-Path $Root ".server.pid"

if (!(Test-Path $PidFile)) {
    Write-Host "No PID file found. Server is not running from these scripts."
    exit 0
}

$ServerPid = Get-Content $PidFile
$Process = Get-Process -Id $ServerPid -ErrorAction SilentlyContinue

if ($Process) {
    Stop-Process -Id $ServerPid
    Write-Host "Stopped server with PID $ServerPid"
} else {
    Write-Host "No running process found for PID $ServerPid"
}

Remove-Item $PidFile
