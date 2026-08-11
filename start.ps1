$ErrorActionPreference = "Stop"

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-File", "`"$PSCommandPath`""
    exit
}

$ProjectRoot = $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"

function Write-Status {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $line = "$timestamp [$Level] $Message"
    switch ($Level) {
        "ERROR" { Write-Host $line -ForegroundColor Red }
        "WARN"  { Write-Host $line -ForegroundColor Yellow }
        default { Write-Host $line }
    }
}

try {
    Write-Status "Checking PostgreSQL service"
    $pgService = Get-Service -Name "postgresql-x64-17" -ErrorAction SilentlyContinue

    if (-not $pgService) {
        Write-Status "PostgreSQL service not found. Is it installed?" "ERROR"
        exit 1
    }

    if ($pgService.Status -ne "Running") {
        Write-Status "PostgreSQL is stopped. Starting..." "WARN"
        Start-Service -Name "postgresql-x64-17"
        Start-Sleep -Seconds 2
        $pgService.Refresh()
        if ($pgService.Status -eq "Running") {
            Write-Status "PostgreSQL started successfully"
        } else {
            Write-Status "Failed to start PostgreSQL" "ERROR"
            exit 1
        }
    } else {
        Write-Status "PostgreSQL already running"
    }

    if (-not (Test-Path $BackendDir)) {
        Write-Status "Backend directory not found at $BackendDir" "ERROR"
        exit 1
    }

    $venvPython = "python"

    if (Test-Path $FrontendDir) {
        $packageJson = Join-Path $FrontendDir "package.json"
        if (Test-Path $packageJson) {
            Write-Status "Starting frontend dev server"
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendDir'; npm run dev"
            Start-Sleep -Seconds 3
            Start-Process "http://localhost:5173"
        } else {
            Write-Status "Frontend not scaffolded yet (no package.json), skipping" "WARN"
        }
    } else {
        Write-Status "Frontend directory not found, skipping" "WARN"
    }

    Write-Status "Starting backend server (browser will auto-open)"
    Set-Location (Join-Path $BackendDir "app")
    & python -m uvicorn main:app --reload

} catch {
    Write-Status "Start script failed: $_" "ERROR"
    exit 1
}
