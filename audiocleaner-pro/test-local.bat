@echo off
echo 🚀 Starting AudioCleaner Pro Local Testing...
echo.

echo 📦 Installing dependencies...
call npm install

echo.
echo 🔧 Starting backend on port 3001...
start "Backend Server" cmd /k "cd backend && set PORT=3001 && npm run dev"

echo.
echo ⏳ Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo.
echo 🌐 Starting proxy server on port 8080...
start "Proxy Server" cmd /k "npm run dev"

echo.
echo ✅ Both servers starting...
echo.
echo 📱 Open your browser to: http://localhost:8080
echo 🔗 Backend API: http://localhost:3001
echo.
echo 💡 Press any key to stop both servers...
pause > nul

echo.
echo 🛑 Stopping servers...
taskkill /f /im node.exe 2>nul
echo ✅ Servers stopped!
