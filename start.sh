#!/bin/bash

echo "========================================"
echo "  YourBooks ERP - Starting Servers"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Node.js version:"
node --version
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start Backend Server
echo "Starting Backend Server (Port 4000)..."
cd "$SCRIPT_DIR/server"
npm install
gnome-terminal -- bash -c "cd '$SCRIPT_DIR/server' && npm run dev; exec bash" 2>/dev/null || \
xterm -e "cd '$SCRIPT_DIR/server' && npm run dev; bash" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd '"$SCRIPT_DIR"'/server && npm run dev"' 2>/dev/null &

# Wait for backend to start
sleep 5

# Start Frontend Server
echo "Starting Frontend Server (Port 3000)..."
cd "$SCRIPT_DIR/client"
npm install
gnome-terminal -- bash -c "cd '$SCRIPT_DIR/client' && npm run dev; exec bash" 2>/dev/null || \
xterm -e "cd '$SCRIPT_DIR/client' && npm run dev; bash" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd '"$SCRIPT_DIR"'/client && npm run dev"' 2>/dev/null &

echo ""
echo "========================================"
echo "  Both servers are starting..."
echo "========================================"
echo ""
echo "  Backend:  http://localhost:4000"
echo "  Frontend: http://localhost:3000"
echo ""
echo "Opening browser in 5 seconds..."
sleep 5

# Open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v open &> /dev/null; then
    open http://localhost:3000
fi

echo ""
echo "To stop the servers, close both terminal windows."
