#!/bin/bash

echo "Starting Audio Hub Suite Development Environment..."
echo

echo "Installing dependencies for Landing Page Backend..."
cd landing/backend
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install landing dependencies"
    exit 1
fi

echo
echo "Installing dependencies for AudioCleaner Pro Backend..."
cd ../../audiocleaner-pro/backend
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install audiocleaner dependencies"
    exit 1
fi

echo
echo "Starting Landing Page Auth Backend on port 3001..."
cd ../../landing/backend
npm run dev &
LANDING_PID=$!

echo
echo "Starting AudioCleaner Pro Backend on port 3000..."
cd ../../audiocleaner-pro/backend
npm run dev &
AUDIOCLEANER_PID=$!

echo
echo "Development servers starting..."
echo
echo "Landing Page Auth Backend: http://localhost:3001"
echo "AudioCleaner Pro Backend: http://localhost:3000"
echo
echo "Open these URLs in your browser:"
echo "- Landing Page: file://$(pwd)/landing/index.html"
echo "- AudioCleaner Pro: file://$(pwd)/audiocleaner-pro/index.html"
echo
echo "Press Ctrl+C to stop all servers..."

# Function to cleanup on exit
cleanup() {
    echo "Stopping servers..."
    kill $LANDING_PID 2>/dev/null
    kill $AUDIOCLEANER_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT

# Wait for background processes
wait
