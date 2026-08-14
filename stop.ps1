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

function Stop-ProcessTree {
    param([int]$ProcessId, [string]$Label)

    try {
        $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
        if (-not $parent) { return }

        $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue
        foreach ($child in $children) {
            Stop-ProcessTree -ProcessId $child.ProcessId -Label "$Label (child)"
        }

        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 300

        $stillAlive = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($stillAlive) {
            Write-Status "$Label (PID $ProcessId) did not terminate cleanly" "WARN"
        } else {
            Write-Status "$Label (PID $ProcessId) stopped"
        }
    } catch {
        Write-Status "Error stopping $Label (PID $ProcessId): $_" "ERROR"
    }
}

Write-Status "Stopping backend (uvicorn) processes"
$uvicornProcs = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" |
    Where-Object { $_.CommandLine -match "uvicorn" }

if ($uvicornProcs) {
    foreach ($proc in $uvicornProcs) {
        $parentId = $proc.ParentProcessId
        $parentProc = Get-CimInstance Win32_Process -Filter "ProcessId = $parentId" -ErrorAction SilentlyContinue
        if ($parentProc -and $parentProc.Name -match "powershell|cmd") {
            Stop-ProcessTree -ProcessId $parentId -Label "Backend terminal"
        } else {
            Stop-ProcessTree -ProcessId $proc.ProcessId -Label "Backend (uvicorn)"
        }
    }
} else {
    Write-Status "No running uvicorn process found"
}

Write-Status "Stopping frontend (npm/node/vite) processes"
$nodeProcs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -match "vite|npm" }

if ($nodeProcs) {
    foreach ($proc in $nodeProcs) {
        $parentId = $proc.ParentProcessId
        $parentProc = Get-CimInstance Win32_Process -Filter "ProcessId = $parentId" -ErrorAction SilentlyContinue
        if ($parentProc -and $parentProc.Name -match "powershell|cmd") {
            Stop-ProcessTree -ProcessId $parentId -Label "Frontend terminal"
        } else {
            Stop-ProcessTree -ProcessId $proc.ProcessId -Label "Frontend (node)"
        }
    }
} else {
    Write-Status "No running frontend dev server found"
}

Write-Status "Verifying no leftover processes remain"
$leftoverUvicorn = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" |
    Where-Object { $_.CommandLine -match "uvicorn" }
$leftoverNode = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -match "vite|npm" }

if ($leftoverUvicorn -or $leftoverNode) {
    Write-Status "Some processes could not be fully terminated. Manual check recommended (Task Manager)." "WARN"
} else {
    Write-Status "No leftover backend/frontend processes detected"
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
