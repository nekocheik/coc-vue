#!/bin/bash
# scripts/run_node_ping_test.sh
# Script to start a Node.js ping server and run the ping test

# Set the path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Node.js ping server...${NC}"

# Start the Node.js ping server in the background
node "$PROJECT_ROOT/scripts/node_ping_server.js" > ping_server.log 2>&1 &
SERVER_PID=$!

# Wait for the server to start
echo -e "${YELLOW}Waiting for ping server to start...${NC}"
sleep 2

# Function to clean up when the script exits
function cleanup {
  echo -e "${YELLOW}Cleaning up...${NC}"
  if ps -p $SERVER_PID > /dev/null; then
    echo -e "${YELLOW}Killing server process (PID: $SERVER_PID)${NC}"
    kill $SERVER_PID
  fi
  echo -e "${GREEN}Cleanup complete${NC}"
}

# Register the cleanup function to be called on exit
trap cleanup EXIT

# Run the ping test
echo -e "${GREEN}Running ping test...${NC}"
node "$PROJECT_ROOT/scripts/ping_test.js"
PING_RESULT=$?

# Show the server log
echo -e "${YELLOW}Server log:${NC}"
cat ping_server.log
rm ping_server.log

if [ $PING_RESULT -eq 0 ]; then
  echo -e "${GREEN}Ping test successful!${NC}"
  exit 0
else
  echo -e "${RED}Ping test failed!${NC}"
  exit 1
fi
