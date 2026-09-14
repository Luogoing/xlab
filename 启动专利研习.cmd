@echo off
chcp 65001 >nul
powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0scripts\Start-PatentLab.ps1"
if errorlevel 1 pause
