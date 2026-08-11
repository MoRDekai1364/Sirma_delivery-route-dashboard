$ErrorActionPreference = "Continue"

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-File", "`"$PSCommandPath`""
    exit
}

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

Write-Status "Stopping backend (uvicorn) processes"
$uvicornProcs = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" |
    Where-Object { $_.CommandLine -match "uvicorn" }

if ($uvicornProcs) {
    foreach ($proc in $uvicornProcs) {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Status "Stopped process ID $($proc.ProcessId)"
    }
} else {
    Write-Status "No running uvicorn process found"
}

Write-Status "Stopping frontend (npm/node) dev server"
$nodeProcs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -match "vite|npm" }

if ($nodeProcs) {
    foreach ($proc in $nodeProcs) {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Status "Stopped process ID $($proc.ProcessId)"
    }
} else {
    Write-Status "No running frontend dev server found"
}

$stopPostgres = Read-Host "Stop PostgreSQL service too? (y/N)"
if ($stopPostgres -eq "y") {
    $pgService = Get-Service -Name "postgresql-x64-17" -ErrorAction SilentlyContinue
    if ($pgService -and $pgService.Status -eq "Running") {
        Stop-Service -Name "postgresql-x64-17"
        Write-Status "PostgreSQL service stopped"
    } else {
        Write-Status "PostgreSQL service not running or not found"
    }
} else {
    Write-Status "Leaving PostgreSQL running"
}

Write-Status "Stop complete"
