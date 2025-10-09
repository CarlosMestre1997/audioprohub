#!/bin/bash

echo "🚀 Starting AudioCleaner Pro Local Testing..."
echo

echo "📦 Installing dependencies..."
npm install

echo
echo "🔧 Starting backend on port 3001..."
cd backend && PORT=3001 npm run dev &
BACKEND_PID=$!

echo
echo "⏳ Waiting for backend to start..."
sleep 3

echo
echo "🌐 Starting proxy server on port 8080..."
cd .. && npm run dev &
PROXY_PID=$!

echo
echo "✅ Both servers starting..."
echo
echo "📱 Open your browser to: http://localhost:8080"
echo "🔗 Backend API: http://localhost:3001"
echo
echo "💡 Press Ctrl+C to stop both servers..."

# Wait for user to stop
wait

echo
echo "🛑 Stopping servers..."
kill $BACKEND_PID 2>/dev/null
kill $PROXY_PID 2>/dev/null
echo "✅ Servers stopped!"
