# Rolling Weft — Auto-start dolt sql-server at Windows logon
#
# Creates a hidden VBScript launcher and registers it in HKCU\...\Run.
# Dolt runs hidden (no console window). No admin rights required.
#
# To stop auto-start:
#   Remove-ItemProperty HKCU:\Software\Microsoft\Windows\CurrentVersion\Run -Name DoltSqlServer

Write-Host ''
Write-Host 'Set up dolt sql-server auto-start' -ForegroundColor Cyan
Write-Host ''

# Find dolt executable
$doltCmd = Get-Command dolt -ErrorAction SilentlyContinue
if (-not $doltCmd) {
    Write-Host 'ERROR: dolt not found in PATH.' -ForegroundColor Red
    Write-Host '       Install Dolt first: https://docs.dolthub.com/introduction/installation'
    Read-Host "`nPress Enter to close" | Out-Null
    exit 1
}

$doltPath = $doltCmd.Source

Write-Host "  dolt path: $doltPath"
Write-Host "  port     : 3307"
Write-Host ''

# Clean up old methods (Scheduled Task, Startup folder VBS)
schtasks /query /tn DoltSqlServer 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host 'Found old Scheduled Task — trying to remove...' -ForegroundColor Yellow
    schtasks /delete /tn DoltSqlServer /f 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host '  Removed.' -ForegroundColor Green
    } else {
        Write-Host '  Could not remove (needs admin). Run as Administrator:' -ForegroundColor Yellow
        Write-Host '    schtasks /delete /tn DoltSqlServer /f'
    }
    Write-Host ''
}

$oldVbs = Join-Path ([Environment]::GetFolderPath('Startup')) 'DoltSqlServer.vbs'
if (Test-Path $oldVbs) {
    Remove-Item $oldVbs -Force
    Write-Host 'Removed old Startup folder VBS.' -ForegroundColor Yellow
    Write-Host ''
}

# Create VBScript launcher in user profile
$vbsDir = Join-Path $env:USERPROFILE '.rolling-weft'
if (-not (Test-Path $vbsDir)) { New-Item -ItemType Directory -Path $vbsDir | Out-Null }
$vbsPath = Join-Path $vbsDir 'start-dolt.vbs'
$vbsContent = "CreateObject(`"WScript.Shell`").Run `"""""$doltPath"""" sql-server --port 3307`", 0, False"
Set-Content -Path $vbsPath -Value $vbsContent -Encoding ASCII

Write-Host "  launcher: $vbsPath"

# Register in HKCU Run (standard user auto-start, no approval needed)
$regPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
Set-ItemProperty -Path $regPath -Name 'DoltSqlServer' -Value "wscript.exe `"$vbsPath`""

Write-Host "  registry: HKCU\...\Run\DoltSqlServer"
Write-Host ''
Write-Host 'Dolt will start hidden at each logon.' -ForegroundColor Green
Write-Host ''

# Start it right now too
Write-Host 'Starting dolt now...'
wscript.exe "$vbsPath"
Start-Sleep -Seconds 2

# Verify
& node -e "const n=require('net'),s=new n.Socket();s.setTimeout(1000);s.on('connect',()=>{s.destroy();process.exit(0)});s.on('timeout',()=>{s.destroy();process.exit(1)});s.on('error',()=>process.exit(1));s.connect(3307,'127.0.0.1');" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host 'Dolt SQL Server is running (port 3307).' -ForegroundColor Green
} else {
    Write-Host 'Dolt may still be starting — check port 3307 in a few seconds.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'To stop auto-start later:'
Write-Host '  Remove-ItemProperty HKCU:\Software\Microsoft\Windows\CurrentVersion\Run -Name DoltSqlServer'
Write-Host ''
Read-Host 'Press Enter to close' | Out-Null
