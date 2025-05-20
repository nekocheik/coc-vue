#!/bin/bash
# scripts/run_ping_test.sh
# Script to start a headless Neovim instance and run the ping test

# Set the path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Neovim test server...${NC}"

# Use the embedded ping server init script
PING_INIT_VIM="$PROJECT_ROOT/scripts/vim/ping_init.vim"

# Start Neovim in headless mode with our ping server init.vim
nvim --headless -u "$PING_INIT_VIM" &
NVIM_PID=$!

# Wait for the server to start
echo -e "${YELLOW}Waiting for Neovim test server to start...${NC}"
sleep 5  # Increased wait time to ensure server is fully initialized

# Function to clean up when the script exits
function cleanup {
  echo -e "${YELLOW}Cleaning up...${NC}"
  if ps -p $NVIM_PID > /dev/null; then
    echo -e "${YELLOW}Killing Neovim process (PID: $NVIM_PID)${NC}"
    kill $NVIM_PID
  fi
  # No need to remove the init file as it's part of the project
  echo -e "${GREEN}Cleanup complete${NC}"
}

# Register the cleanup function to be called on exit
trap cleanup EXIT

# Run the ping test
echo -e "${GREEN}Running ping test...${NC}"
node "$PROJECT_ROOT/scripts/test/ping_test.js"
PING_RESULT=$?

if [ $PING_RESULT -eq 0 ]; then
  echo -e "${GREEN}Ping test successful!${NC}"
  exit 0
else
  echo -e "${RED}Ping test failed!${NC}"
  exit 1
fi
