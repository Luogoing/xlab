@echo off
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0scripts\Stop-PatentLab.ps1"
if errorlevel 1 pause
