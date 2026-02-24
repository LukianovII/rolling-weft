@echo off
REM Rolling Weft — Windows setup launcher
REM Double-click or run: install.bat [path]
powershell -NoLogo -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
