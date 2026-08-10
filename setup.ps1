$ErrorActionPreference = "Stop"

$LogTemp = Join-Path $env:TEMP "delivery_route_setup_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
$ProjectRoot = $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"

$RequiredPythonVersion = [version]"3.11.0"
$RequiredNodeVersion = [version]"18.0.0"
$DbName = "delivery_route_db"
$DbUser = "delivery_user"
$DbPassword = "delivery_pass"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "$timestamp [$Level] $Message"
    Add-Content -Path $LogTemp -Value $line
    switch ($Level) {
        "ERROR" { Write-Host $line -ForegroundColor Red }
        "WARN"  { Write-Host $line -ForegroundColor Yellow }
        default { Write-Host $line }
    }
}

function Show-Progress {
    param([int]$Current, [int]$Total, [string]$Activity)
    $percent = [math]::Round(($Current / $Total) * 100)
    Write-Progress -Activity $Activity -Status "$percent%" -PercentComplete $percent
}

function Test-CommandExists {
    param([string]$Command)
    return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
}

function Install-WithWinget {
    param([string]$PackageId, [string]$FriendlyName)
    Write-Log "Installing $FriendlyName via winget ($PackageId)"
    try {
        winget install --id $PackageId -e --accept-package-agreements --accept-source-agreements --silent
        Write-Log "$FriendlyName installed successfully"
    } catch {
        Write-Log "Failed to install $FriendlyName : $_" "ERROR"
        throw
    }
}

function Get-ExeVersion {
    param([string]$Command, [string]$VersionArg = "--version")
    try {
        $raw = & $Command $VersionArg 2>&1
        $match = [regex]::Match($raw, '\d+\.\d+(\.\d+)?')
        if ($match.Success) { return [version]$match.Value }
    } catch {}
    return $null
}

try {
    Write-Log "Setup started. Project root: $ProjectRoot"
    Write-Log "Log path (temp): $LogTemp"

    $steps = @("Python", "Node", "PostgreSQL", "Backend deps", "Frontend deps", "Database", "Env file")
    $stepIndex = 0
    $totalSteps = $steps.Count

    # Step 1: Python
    $stepIndex++
    Show-Progress $stepIndex $totalSteps "Checking Python"
    if (-not (Test-CommandExists "python")) {
        Write-Log "Python not found" "WARN"
        Install-WithWinget "Python.Python.3.12" "Python"
    } else {
        $pyVer = Get-ExeVersion "python"
        if ($pyVer -and $pyVer -lt $RequiredPythonVersion) {
            Write-Log "Python $pyVer is older than required $RequiredPythonVersion" "WARN"
            Install-WithWinget "Python.Python.3.12" "Python"
        } else {
            Write-Log "Python OK: $pyVer"
        }
    }

    # Step 2: Node
    $stepIndex++
    Show-Progress $stepIndex $totalSteps "Checking Node.js"
    if (-not (Test-CommandExists "node")) {
        Write-Log "Node.js not found" "WARN"
        Install-WithWinget "OpenJS.NodeJS.LTS" "Node.js"
    } else {
        $nodeVer = Get-ExeVersion "node"
        if ($nodeVer -and $nodeVer -lt $RequiredNodeVersion) {
            Write-Log "Node $nodeVer is older than required $RequiredNodeVersion" "WARN"
            Install-WithWinget "OpenJS.NodeJS.LTS" "Node.js"
        } else {
            Write-Log "Node OK: $nodeVer"
        }
    }

    # Step 3: PostgreSQL
    $stepIndex++
    Show-Progress $stepIndex $totalSteps "Checking PostgreSQL"
    if (-not (Test-CommandExists "psql")) {
        Write-Log "PostgreSQL not found" "WARN"
        Install-WithWinget "PostgreSQL.PostgreSQL.17" "PostgreSQL"
        Write-Log "PostgreSQL installed. You may need to restart this terminal for PATH to update." "WARN"
    } else {
        Write-Log "PostgreSQL OK"
    }

    # Refresh PATH in current session after possible installs
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    # Step 4: Backend deps
    $stepIndex++
    Show-Progress $stepIndex $totalSteps "Installing backend dependencies"
    if (-not (Test-Path $BackendDir)) {
        Write-Log "Backend directory not found at $BackendDir" "ERROR"
        throw "Backend directory missing"
    }
    Push-Location $BackendDir
    if (-not (Test-Path "venv")) {
        Write-Log "Creating Python virtual environment"
        python -m venv venv
    }
    $venvPip = Join-Path $BackendDir "venv\Scripts\pip.exe"
    & $venvPip install -r requirements.txt --quiet
    Write-Log "Backend dependencies installed"
    Pop-Location

    # Step 5: Frontend deps
    $stepIndex++
    Show-Progress $stepIndex $totalSteps "Installing frontend dependencies"
    if (-not (Test-Path $FrontendDir)) {
        Write-Log "Frontend directory not found at $FrontendDir" "WARN"
    } else {
        Push-Location $FrontendDir
        if (Test-Path "package.json") {
            npm install --silent
            Write-Log "Frontend dependencies installed"
        } else {
            Write-Log "package.json not found, skipping npm install" "WARN"
        }
        Pop-Location
    }

    # Step 6: Database
    $stepIndex++
    Show-Progress $stepIndex $totalSteps "Setting up database"
    $env:PGPASSWORD = "postgres"
    $dbExists = & psql -U postgres -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'" 2>$null
    if ($dbExists -ne "1") {
        Write-Log "Creating database and user"
        & psql -U postgres -h localhost -c "CREATE USER $DbUser WITH PASSWORD '$DbPassword';" 2>$null
        & psql -U postgres -h localhost -c "CREATE DATABASE $DbName OWNER $DbUser;" 2>$null
        Write-Log "Database '$DbName' and user '$DbUser' created"
    } else {
        Write-Log "Database '$DbName' already exists, skipping creation"
    }
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

    # Step 7: .env file
    $stepIndex++
    Show-Progress $stepIndex $totalSteps "Writing .env file"
    $envPath = Join-Path $BackendDir ".env"
    if (-not (Test-Path $envPath)) {
        $connString = "DATABASE_URL=postgresql://${DbUser}:${DbPassword}@localhost:5432/${DbName}"
        Set-Content -Path $envPath -Value $connString
        Write-Log ".env created at $envPath"
    } else {
        Write-Log ".env already exists, skipping" 
    }

    Write-Progress -Activity "Setup" -Completed
    Write-Log "Setup completed successfully"

    $logsDir = Join-Path $ProjectRoot "logs"
    New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
    Copy-Item -Path $LogTemp -Destination $logsDir -Force
    Write-Log "Log copied to $logsDir"

    Write-Host ""
    Write-Host "Setup finished. Log file: $(Join-Path $logsDir (Split-Path $LogTemp -Leaf))"

} catch {
    Write-Log "Setup failed: $_" "ERROR"
    Write-Host ""
    Write-Host "Setup FAILED. Check log: $LogTemp" -ForegroundColor Red
    exit 1
}
