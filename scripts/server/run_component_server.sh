#!/bin/bash
# scripts/run_component_server.sh
# Script to start a headless Neovim instance with the component server

# Set the path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Neovim component server...${NC}"

# Check if port 9999 is already in use
if lsof -i :9999 > /dev/null 2>&1; then
  echo -e "${RED}Port 9999 is already in use. Killing existing processes...${NC}"
  lsof -i :9999 -t | xargs kill -9
  sleep 2
fi

# Clean up any existing Neovim processes
echo -e "${YELLOW}Cleaning up existing Neovim processes...${NC}"
pkill -f "nvim --headless" || true
sleep 2

# Create a log file for the server
LOG_FILE="/tmp/component-server.log"
touch "$LOG_FILE"
chmod 666 "$LOG_FILE" 2>/dev/null || true

# Start Neovim in headless mode with our component server init script
echo -e "${YELLOW}Starting Neovim with component server...${NC}"
nvim --headless -u "$PROJECT_ROOT/scripts/vim/component_server_init.vim" > "$LOG_FILE" 2>&1 &
NVIM_PID=$!

# Wait for the server to start
echo -e "${YELLOW}Waiting for component server to start...${NC}"

# Wait for up to 10 seconds for the server to start
for i in {1..10}; do
  if grep -q "Component server initialized and running" "$LOG_FILE" 2>/dev/null; then
    echo -e "${GREEN}Component server started successfully!${NC}"
    break
  fi
  
  # Check if Neovim process is still running
  if ! ps -p $NVIM_PID > /dev/null; then
    echo -e "${RED}Neovim process died unexpectedly. Check logs.${NC}"
    cat "$LOG_FILE"
    exit 1
  fi
  
  sleep 1
done

# Verify that the server is listening on port 9999
if ! lsof -i :9999 > /dev/null 2>&1; then
  echo -e "${RED}Component server is not listening on port 9999.${NC}"
  echo -e "${YELLOW}Log contents:${NC}"
  cat "$LOG_FILE"
  exit 1
fi

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
echo -e "${GREEN}Component server running on 127.0.0.1:9999${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"

# Keep the script running until user interrupts
while true; do
  sleep 1
done
