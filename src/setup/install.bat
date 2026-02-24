@echo off
REM Rolling Weft — Windows setup
REM Run from the framework directory, pass target project path as argument.
REM
REM Usage:
REM   src\setup\install.bat C:\projects\my-app

if "%~1"=="" (
    echo Where should Rolling Weft be installed?
    echo Example: C:\projects\my-app
    echo.
    set /p TARGET_PATH="Project path: "
) else (
    set TARGET_PATH=%~1
)

if "%TARGET_PATH%"=="" (
    echo.
    echo ERROR: No path entered.
    pause >nul
    exit /b 1
)

REM Strip trailing backslash (breaks quoted argument on cmd)
if "%TARGET_PATH:~-1%"=="\" set TARGET_PATH=%TARGET_PATH:~0,-1%

echo.
echo Rolling Weft setup
echo   Target: %TARGET_PATH%
echo.

REM --- Check dependencies ---
echo Checking dependencies...

node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Node.js is not installed.
    echo        Download from https://nodejs.org then re-run this script.
    pause
    exit /b 1
)
echo   [ok] node

npm --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: npm not found. Re-install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo   [ok] npm

bd --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: beads (bd) is not installed.
    echo        Install it first, then re-run this script.
    echo.
    echo        Option A ^(recommended if Go is installed^):
    echo          go install github.com/steveyegge/beads/cmd/bd@latest
    echo.
    echo        Option B ^(npm^):
    echo          Add-MpPreference -ExclusionPath "$env:APPDATA\npm"
    echo          npm install -g @beads/bd
    echo.
    pause
    exit /b 1
) else (
    echo   [ok] beads
)

dolt version >nul 2>&1
if errorlevel 1 (
    echo   [!] dolt not found. beads requires dolt as storage backend.
    echo       Install from: https://docs.dolthub.com/introduction/installation
    echo       Then re-run this script or run: bd init
) else (
    echo   [ok] dolt
)

echo.
node "%~dp0setup.js" "%TARGET_PATH%"
if errorlevel 1 (
    echo.
    echo Setup failed. See output above.
    echo Press any key to close...
    pause >nul
    exit /b 1
)

echo.
echo ============================================================
echo  Setup complete!
echo  Next: open Claude Code in your project and run:
echo    @skills/onboarding
echo ============================================================
echo.
echo Press any key to close...
pause >nul
