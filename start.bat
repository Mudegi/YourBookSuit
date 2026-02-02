@echo off
echo ========================================
echo   YourBooks ERP - Starting Servers
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Start Backend Server
echo Starting Backend Server (Port 4000)...
start "YourBooks Backend" cmd /k "cd /d %~dp0server && echo Installing dependencies... && npm install && echo. && echo Starting backend server... && npm run dev"

REM Wait a bit for backend to start
timeout /t 5 /nobreak >nul

REM Start Frontend Server
echo Starting Frontend Server (Port 3000)...
start "YourBooks Frontend" cmd /k "cd /d %~dp0client && echo Installing dependencies... && npm install && echo. && echo Starting frontend server... && npm run dev"

echo.
echo ========================================
echo   Both servers are starting...
echo ========================================
echo.
echo   Backend:  http://localhost:4000
echo   Frontend: http://localhost:3000
echo.
echo   Press any key to open browser...
pause >nul

REM Open browser
start http://localhost:3000

echo.
echo To stop the servers, close both terminal windows.
echo.
pause
