@echo off
setlocal
cd /d "%~dp0"

title Sonia - Clarity Archive & Podcast Studio

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not on PATH.
  echo Install Node.js from https://nodejs.org/ and try again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies for the first time...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo Starting Sonia Studio API (http://localhost:3001) and UI (http://localhost:5173)...
echo Press Ctrl+C in this window to stop both servers.
echo.

start "" /min cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173"
call npm run dev

if errorlevel 1 (
  echo.
  echo [ERROR] Server stopped unexpectedly.
  pause
)
