#!/bin/bash

echo "🚗 Starting AssamRideConnect Development Servers..."

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use. Please stop the service using port $1 first."
        return 1
    fi
    return 0
}

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first:"
    echo "   macOS: brew services start mongodb-community"
    echo "   Windows: net start MongoDB"
    echo "   Linux: sudo systemctl start mongod"
    echo ""
fi

# Check ports
# Use 5000 for backend in development to match frontend configuration
BACKEND_PORT=5000
FRONTEND_PORT=3000
check_port $BACKEND_PORT || exit 1
check_port $FRONTEND_PORT || exit 1

echo "📦 Installing dependencies..."

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd ../frontend
npm install

echo ""
echo "🚀 Starting servers..."
echo ""

# Start backend server
echo "Starting backend server on http://localhost:$BACKEND_PORT"
cd ../backend
PORT=$BACKEND_PORT npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo "Starting frontend server on http://localhost:$FRONTEND_PORT"
cd ../frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Development servers started!"
echo "   Frontend: http://localhost:$FRONTEND_PORT"
echo "   Backend:  http://localhost:$BACKEND_PORT"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
wait

# Cleanup on exit
echo ""
echo "🛑 Stopping servers..."
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
echo "✅ Servers stopped!"

# Make the script executable
chmod +x start-dev.sh

# Run the development script
./start-dev.sh