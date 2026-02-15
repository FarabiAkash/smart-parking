@echo off
setlocal

echo ===============================
echo  Smart Parking - Dev Launcher
echo ===============================

REM ---- Backend ----
echo.
echo [1/2] Starting Django backend...
cd backend

if not exist venv (
  echo Creating virtual environment...
  python -m venv venv
)

call venv\Scripts\activate

echo Installing backend dependencies...
pip install -r requirements.txt

echo Running migrations...
python manage.py migrate

start "Django Backend" cmd /k "call venv\Scripts\activate && python manage.py runserver 8000"

REM ---- Frontend ----
echo.
echo [2/2] Starting Next.js frontend...
cd ..\frontend

if not exist node_modules (
  echo Installing frontend dependencies...
  npm install
)

start "Next.js Frontend" cmd /k "npm run dev"

echo.
echo Done.
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:3000
echo.
pause
