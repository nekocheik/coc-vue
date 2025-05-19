#!/bin/bash
# scripts/run_command_server.sh
# Script to start a headless Neovim instance with the command server

# Set the path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Neovim command server...${NC}"

# Start Neovim in headless mode with our command server init script
nvim --headless -u "$PROJECT_ROOT/scripts/command_server_init.vim" &
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

# Print server status
echo -e "${GREEN}Command server running on 127.0.0.1:9999${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"

# Keep the script running until user interrupts
while true; do
  sleep 1
done
