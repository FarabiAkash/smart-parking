@echo off
setlocal

cd /d "%~dp0"

echo ===============================
echo  Smart Parking - Dev Launcher
echo ===============================
echo.

REM ---- Pre-flight checks ----
echo [Pre-flight] Checking prerequisites...

where python >nul 2>&1
if errorlevel 1 (
  echo ERROR: Python not found. Install Python and add it to PATH.
  pause
  exit /b 1
)
echo   Python: OK

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not found. Install Node.js and add it to PATH.
  pause
  exit /b 1
)
echo   Node: OK

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm not found. Install Node.js - it includes npm.
  pause
  exit /b 1
)
echo   npm: OK
echo.

REM ---- Free ports and clear caches ----
echo [Setup] Freeing ports 8000 and 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
echo   Ports cleared.

echo [Setup] Clearing caches...
if exist frontend\.next rd /s /q frontend\.next
if exist frontend\node_modules\.cache rd /s /q frontend\node_modules\.cache
for /d /r backend %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d" 2>nul
echo   Caches cleared.
echo.

REM ---- Backend setup ----
echo [1/2] Setting up Django backend...
cd backend

if not exist requirements.txt (
  echo ERROR: backend\requirements.txt not found.
  pause
  exit /b 1
)

if not exist venv (
  echo   Creating virtual environment...
  python -m venv venv
  if errorlevel 1 (
    echo ERROR: Failed to create venv.
    pause
    exit /b 1
  )
  echo   venv created.
) else (
  echo   venv present.
)

call venv\Scripts\activate
echo   Installing/updating dependencies...
pip install -q -r requirements.txt
if errorlevel 1 (
  echo ERROR: pip install failed.
  pause
  exit /b 1
)

echo   Running migrations...
python manage.py migrate
if errorlevel 1 (
  echo WARNING: Migration failed. Server may still start.
)

echo   Starting Django server...
start "Django Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && python manage.py runserver 8000"
cd ..
echo.

REM ---- Frontend setup ----
echo [2/2] Setting up Next.js frontend...
cd frontend

if not exist package.json (
  echo ERROR: frontend\package.json not found.
  pause
  exit /b 1
)

if not exist node_modules (
  echo   Installing dependencies - first run...
  call npm install
) else (
  echo   node_modules present. Running npm install to sync...
  call npm install
)
if errorlevel 1 (
  echo ERROR: npm install failed.
  pause
  exit /b 1
)

echo   Starting Next.js dev server...
timeout /t 2 /nobreak >nul
start /normal "Next.js Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
cd ..
echo.

echo Done.
echo   Backend:  http://127.0.0.1:8000
echo   Frontend: http://localhost:3000
echo.
pause
