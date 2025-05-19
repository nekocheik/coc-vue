#!/bin/bash
# scripts/start_test_server.sh
# Script to start a headless Neovim instance for testing

# Set the path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Neovim test server...${NC}"

# Start Neovim in headless mode with our test init.vim
nvim --headless -u "$PROJECT_ROOT/scripts/test_init.vim" &
NVIM_PID=$!

# Wait for the server to start
echo -e "${YELLOW}Waiting for Neovim test server to start...${NC}"
sleep 2

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

# Test the connection
echo -e "${GREEN}Testing connection to Neovim server...${NC}"
node "$PROJECT_ROOT/scripts/test_server_connection.js"
CONNECTION_RESULT=$?

if [ $CONNECTION_RESULT -eq 0 ]; then
  echo -e "${GREEN}Connection test successful!${NC}"
  echo -e "${YELLOW}Server is running with PID: $NVIM_PID${NC}"
  echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
  
  # Keep the script running until user presses Ctrl+C
  while true; do
    sleep 1
  done
else
  echo -e "${RED}Connection test failed!${NC}"
  exit 1
fi
