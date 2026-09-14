@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js 22.13+ is required.
 pause
 exit /b 1
)
echo Open http://127.0.0.1:3000 in your browser.
node scripts/serve.mjs
pause
