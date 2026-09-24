@echo off
title CampusSpace AI - Backend
cd /d "%~dp0backend"

echo ============================================
echo  CampusSpace AI - Backend setup and start
echo ============================================
echo.

if not exist ".env" (
  echo [ERROR] backend\.env is missing. Create it first.
  pause
  exit /b 1
)

echo [1/4] Using separate database "campusspace_p04" so your friend's data is safe...
powershell -NoProfile -Command "$p='.env'; $t=Get-Content $p -Raw; $n=$t -replace '/campusspace_ai\?','/campusspace_p04?'; if ($n -ne $t) { Set-Content $p $n -NoNewline; Write-Host '      .env updated' } else { Write-Host '      already OK' }"
echo.

echo [2/4] Installing packages (skips if already installed)...
if not exist "node_modules" (
  call npm install
  if errorlevel 1 goto fail
) else (
  echo       already installed
)
echo.

echo [3/4] Loading sample data into MongoDB...
call npm run seed
if errorlevel 1 goto fail
echo.

echo [4/4] Starting the API server. KEEP THIS WINDOW OPEN.
echo       Check it in Chrome: http://localhost:5000/api/health
echo.
call npm run dev
pause
exit /b 0

:fail
echo.
echo ============================================
echo  Something failed. Take a screenshot of this
echo  window (hide any password) and send it.
echo ============================================
pause
exit /b 1
