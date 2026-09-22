@echo off
powershell.exe -ExecutionPolicy Bypass -File "%~dp0install.ps1" -CursorOut "%LOCALAPPDATA%\Programs\cursor\resources\app\out"
pause