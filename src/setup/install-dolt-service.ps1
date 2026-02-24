# Rolling Weft — Register dolt sql-server as a Windows startup task
#
# Run this once if you want dolt to start automatically at each logon.
# No administrator rights required.
#
# To remove the task later:
#   schtasks /delete /tn DoltSqlServer /f

$taskName = "DoltSqlServer"

Write-Host ''
Write-Host 'Register dolt sql-server as a startup task' -ForegroundColor Cyan
Write-Host ''

# Check if already registered
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Task '$taskName' is already registered." -ForegroundColor Yellow
    Write-Host 'Dolt will start automatically at each logon.'
    Write-Host ''
    Write-Host 'To remove it:'
    Write-Host '  schtasks /delete /tn DoltSqlServer /f'
    Read-Host "`nPress Enter to close" | Out-Null
    exit 0
}

# Find dolt executable
$doltCmd = Get-Command dolt -ErrorAction SilentlyContinue
if (-not $doltCmd) {
    Write-Host 'ERROR: dolt not found in PATH.' -ForegroundColor Red
    Write-Host '       Install Dolt first: https://docs.dolthub.com/introduction/installation'
    Read-Host "`nPress Enter to close" | Out-Null
    exit 1
}

$doltPath = $doltCmd.Source
$workDir  = $env:USERPROFILE

Write-Host "  dolt path : $doltPath"
Write-Host "  working dir: $workDir"
Write-Host "  port      : 3307"
Write-Host ''

$action   = New-ScheduledTaskAction `
    -Execute        $doltPath `
    -Argument       'sql-server --port 3307' `
    -WorkingDirectory $workDir

$trigger  = New-ScheduledTaskTrigger -AtLogOn

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Seconds 0) `
    -MultipleInstances  IgnoreNew `
    -Hidden

Register-ScheduledTask `
    -TaskName    $taskName `
    -Action      $action `
    -Trigger     $trigger `
    -Settings    $settings `
    -Description 'Dolt SQL Server for beads (Rolling Weft)' `
    -RunLevel    Limited | Out-Null

Write-Host 'Registered.' -ForegroundColor Green
Write-Host 'Dolt SQL Server will start automatically at each logon.'
Write-Host ''

# Start it right now too
Start-ScheduledTask -TaskName $taskName
Write-Host 'Dolt SQL Server started.' -ForegroundColor Green
Write-Host ''
Write-Host 'To remove this task later:'
Write-Host '  schtasks /delete /tn DoltSqlServer /f'
Write-Host ''
Read-Host 'Press Enter to close' | Out-Null
