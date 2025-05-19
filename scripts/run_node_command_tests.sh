#!/bin/bash
# scripts/run_node_command_tests.sh
# Script to start the Node.js command server and run the command tests

# Set the path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Node.js command server...${NC}"

# Check if port 9999 is already in use
if lsof -i :9999 > /dev/null; then
  echo -e "${RED}Port 9999 is already in use. Killing existing processes...${NC}"
  lsof -i :9999 -t | xargs kill -9
  sleep 2
fi

# Start the Node.js command server in the background
node "$PROJECT_ROOT/scripts/node_command_server.js" > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for the server to start
echo -e "${YELLOW}Waiting for command server to start...${NC}"
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

# Run the command tests
echo -e "${GREEN}Running command tests...${NC}"
node "$PROJECT_ROOT/scripts/test_commands.js"
TEST_RESULT=$?

# Show the server log
echo -e "${YELLOW}Server log:${NC}"
if [ -f "command_server.log" ]; then
  cat command_server.log
  rm command_server.log
else
  echo -e "${RED}No server log found${NC}"
fi

if [ $TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}Command tests successful!${NC}"
  exit 0
else
  echo -e "${RED}Command tests failed!${NC}"
  exit 1
fi
