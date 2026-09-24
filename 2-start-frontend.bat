@echo off
title CampusSpace AI - Frontend
cd /d "%~dp0frontend"

echo ============================================
echo  CampusSpace AI - Frontend
echo ============================================
echo.

if not exist "node_modules" (
  echo Installing packages, takes about a minute...
  call npm install
  if errorlevel 1 goto fail
)

echo.
echo Starting... then open http://localhost:5173 in Chrome
echo KEEP THIS WINDOW OPEN.
echo.
call npm run dev
pause
exit /b 0

:fail
echo.
echo Something failed. Take a screenshot of this window and send it.
pause
exit /b 1
