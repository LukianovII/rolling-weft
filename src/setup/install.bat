@echo off
REM Rolling Weft — Windows setup
REM Run from the framework directory, pass target project path as argument.
REM
REM Usage:
REM   src\setup\install.bat C:\projects\my-app

if "%~1"=="" (
    echo ERROR: Target project path is required.
    echo.
    echo Usage:
    echo   src\setup\install.bat C:\projects\my-app
    echo.
    pause
    exit /b 1
)

echo.
echo Rolling Weft setup
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
    echo   [-] beads not found, installing...
    call npm install -g @beads/bd
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install @beads/bd.
        pause
        exit /b 1
    )
    echo   [ok] beads installed
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
node "%~dp0setup.js" "%~1"
if errorlevel 1 (
    echo.
    echo Setup failed. See output above.
    pause
    exit /b 1
)

pause
