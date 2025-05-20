#!/bin/bash
# scripts/run_command_tests.sh
# Script to start the command server and run the command tests

# Set the path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Neovim command server...${NC}"

# Check if port 9999 is already in use
if lsof -i :9999 > /dev/null; then
  echo -e "${RED}Port 9999 is already in use. Killing existing processes...${NC}"
  lsof -i :9999 -t | xargs kill -9
  sleep 2
fi

# Start Neovim in headless mode with our command server init script
nvim --headless -u "$PROJECT_ROOT/scripts/command_server_init.vim" > server.log 2>&1 &
NVIM_PID=$!

# Wait for the server to start
echo -e "${YELLOW}Waiting for command server to start...${NC}"
sleep 5  # Give the server time to initialize

# Function to clean up when the script exits
function cleanup {
  echo -e "${YELLOW}Cleaning up...${NC}"
  if ps -p $NVIM_PID > /dev/null; then
    echo -e "${YELLOW}Killing Neovim process (PID: $NVIM_PID)${NC}"
    kill $NVIM_PID
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
cat server.log
rm server.log

if [ $TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}Command tests successful!${NC}"
  exit 0
else
  echo -e "${RED}Command tests failed!${NC}"
  exit 1
fi
