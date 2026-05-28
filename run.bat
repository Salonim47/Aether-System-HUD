@echo off
title Aether System HUD Launcher
echo ===================================================
echo           AETHER SYSTEM HUD LAUNCHER
echo ===================================================
echo Checking Python installation...

py --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python launcher (py) was not found.
    echo Please install Python 3.10+ and ensure it's available via command line.
    pause
    exit /b 1
)

echo [OK] Python detected.
echo.
echo Installing/Verifying Python dependencies...
py -m pip install fastapi uvicorn psutil
if %errorlevel% neq 0 (
    echo [WARNING] Dependency installation encountered an error. 
    echo Attempting run anyway...
)

echo.
echo ===================================================
echo Starting Aether System HUD Backend Daemon...
echo Server starting on: http://127.0.0.1:8000
echo.
echo [INSTRUCTION]:
echo Open "index.html" in your web browser to view the HUD dashboard!
echo ===================================================
echo.
py app.py
pause
