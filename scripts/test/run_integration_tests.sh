#!/bin/bash
# scripts/run_integration_tests.sh
# Script to start a headless Neovim instance for integration testing

# Set the path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting integration test environment...${NC}"

# Create a temporary init.vim file for the test
TEMP_INIT_VIM=$(mktemp)
cat > "$TEMP_INIT_VIM" << EOF
" Temporary init.vim for integration tests
set runtimepath+=$PROJECT_ROOT
set nocompatible
set hidden
filetype plugin indent on
syntax enable

" Load the test server
lua << EOF_LUA
  package.path = package.path .. ";$PROJECT_ROOT/lua/?.lua"
  local server = require('vue-ui.test.server')
  server.start()
EOF_LUA
EOF

echo -e "${GREEN}Starting headless Neovim with test server...${NC}"

# Start Neovim in headless mode with our temporary init.vim
nvim --headless -u "$TEMP_INIT_VIM" &
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
  rm -f "$TEMP_INIT_VIM"
  echo -e "${GREEN}Cleanup complete${NC}"
}

# Register the cleanup function to be called on exit
trap cleanup EXIT

# Run the integration tests
echo -e "${GREEN}Running integration tests...${NC}"
npm test -- __tests__/integration/select-integration.test.ts

# The cleanup function will be called automatically when the script exits
