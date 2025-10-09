@echo off
echo Starting Audio Hub Suite Development Environment...
echo.

echo Installing dependencies for Landing Page Backend...
cd landing/backend
call npm install
if %errorlevel% neq 0 (
    echo Failed to install landing dependencies
    pause
    exit /b 1
)

echo.
echo Installing dependencies for AudioCleaner Pro Backend...
cd ../../audiocleaner-pro/backend
call npm install
if %errorlevel% neq 0 (
    echo Failed to install audiocleaner dependencies
    pause
    exit /b 1
)

echo.
echo Starting Landing Page Auth Backend on port 3001...
start "Landing Auth Backend" cmd /k "cd /d %~dp0landing/backend && npm run dev"

echo.
echo Starting AudioCleaner Pro Backend on port 3000...
start "AudioCleaner Backend" cmd /k "cd /d %~dp0audiocleaner-pro/backend && npm run dev"

echo.
echo Development servers starting...
echo.
echo Landing Page Auth Backend: http://localhost:3001
echo AudioCleaner Pro Backend: http://localhost:3000
echo.
echo Open these URLs in your browser:
echo - Landing Page: file:///%~dp0landing/index.html
echo - AudioCleaner Pro: file:///%~dp0audiocleaner-pro/index.html
echo.
echo Press any key to exit...
pause > nul
