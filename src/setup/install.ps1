# Rolling Weft — Windows setup
# Usage:
#   Right-click → Run with PowerShell
#   .\install.ps1 C:\projects\my-app

Write-Host ''
Write-Host 'Rolling Weft setup' -ForegroundColor Cyan
Write-Host ''

# ---------------------------------------------------------------------------
# Target path
# ---------------------------------------------------------------------------
$targetPath = $args[0]

if (-not $targetPath) {
    Write-Host 'Where should Rolling Weft be installed?'
    Write-Host 'Example: C:\projects\my-app'
    Write-Host ''
    $targetPath = Read-Host 'Project path'
}

if (-not $targetPath) {
    Write-Host ''
    Write-Host 'ERROR: No path entered.' -ForegroundColor Red
    Read-Host 'Press Enter to close' | Out-Null
    exit 1
}

$targetPath = $targetPath.TrimEnd('\')

Write-Host "  Target: $targetPath"
Write-Host ''

# ---------------------------------------------------------------------------
# Check Node.js
# ---------------------------------------------------------------------------
Write-Host 'Checking dependencies...'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host ''
    Write-Host 'ERROR: Node.js is not installed.' -ForegroundColor Red
    Write-Host '       Download from https://nodejs.org then re-run this script.'
    Write-Host ''
    Read-Host 'Press Enter to close' | Out-Null
    exit 1
}
Write-Host '  [ok] node'

# ---------------------------------------------------------------------------
# Run setup.js  (bd / dolt checks are done inside setup.js)
# ---------------------------------------------------------------------------
Write-Host ''
$setupScript = Join-Path $PSScriptRoot 'setup.js'
node $setupScript $targetPath

if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host 'Setup failed. See output above.' -ForegroundColor Red
    Write-Host ''
    Read-Host 'Press Enter to close' | Out-Null
    exit 1
}

Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
Write-Host ' Setup complete!' -ForegroundColor Green
Write-Host ' Next: open Claude Code in your project and run:' -ForegroundColor Green
Write-Host '   @skills/onboarding' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor Green
Write-Host ''
Read-Host 'Press Enter to close' | Out-Null
