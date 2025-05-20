#!/bin/bash

# Script to run integration tests with optimized configuration
# This script reduces logs and improves result readability
# Added timeout mechanism to avoid deadlocks

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Define global timeout (in seconds)
MAX_TIMEOUT=${MAX_TIMEOUT:-300}  # 5 minutes by default

echo -e "${BLUE}=== Running COC-Vue Integration Tests ===${NC}"
echo -e "${YELLOW}Starting Neovim server for tests...${NC}"
echo -e "${YELLOW}Timeout set to ${MAX_TIMEOUT} seconds${NC}"

# Make sure nothing is running on port 9999
if lsof -i :9999 > /dev/null 2>&1; then
  echo -e "${YELLOW}Stopping all processes on port 9999...${NC}"
  kill -9 $(lsof -t -i:9999) 2>/dev/null
  sleep 2
fi

# Configure trap for cleanup on interruption
trap cleanup EXIT INT TERM

# Function to clean up processes
cleanup() {
  echo -e "\n${YELLOW}Cleaning up processes...${NC}"
  
  # Stop Neovim server if we started it
  if [ -n "$SERVER_PID" ]; then
    echo -e "${YELLOW}Stopping Neovim server (PID: $SERVER_PID)...${NC}"
    kill -9 $SERVER_PID 2>/dev/null
    sleep 1
  fi
  
  # Stop Jest process if it's running
  if [ -n "$JEST_PID" ]; then
    echo -e "${YELLOW}Stopping Jest process (PID: $JEST_PID)...${NC}"
    kill -9 $JEST_PID 2>/dev/null
    sleep 1
  fi
}

# Start Neovim server for tests
echo -e "${YELLOW}Starting Neovim server for tests...${NC}"
./test-improved/scripts/start-test-server.sh
SERVER_PID=$!

# Check if server started successfully
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to start Neovim server.${NC}"
  echo -e "${YELLOW}Check logs in /tmp/neovim-server.log for details.${NC}"
  exit 1
fi

# Wait for server to be ready
sleep 2

# Run integration tests
echo -e "${YELLOW}Running integration tests...${NC}"

# Run integration tests with Jest in background
VERBOSE_LOGS=${VERBOSE_LOGS:-false} npx jest --config ./test-improved/jest.config.js --selectProjects INTEGRATION "$@" &
JEST_PID=$!

# Monitor Jest process with timeout
ELAPSED=0
DOT_COUNTER=0

while kill -0 $JEST_PID 2>/dev/null; do
  if [ $ELAPSED -ge $MAX_TIMEOUT ]; then
    echo -e "\n${RED}ERROR: Tests exceeded timeout of ${MAX_TIMEOUT} seconds.${NC}"
    echo -e "${RED}Force stopping tests...${NC}"
    cleanup
    exit 1
  fi
  
  # Show a dot every 10 seconds to indicate the script is still active
  if [ $((DOT_COUNTER % 10)) -eq 0 ]; then
    echo -n "."
  fi
  
  sleep 1
  ELAPSED=$((ELAPSED + 1))
  DOT_COUNTER=$((DOT_COUNTER + 1))
done

wait $JEST_PID
TEST_RESULT=$?

if [ $TEST_RESULT -eq 0 ]; then
  echo -e "\n${GREEN}✓ All integration tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Some integration tests failed.${NC}"
  echo -e "${YELLOW}For more detailed logs, run:${NC}"
  echo -e "${YELLOW}VERBOSE_LOGS=true ./test-improved/scripts/run-integration-tests.sh${NC}"
  echo -e "${YELLOW}To increase timeout, run:${NC}"
  echo -e "${YELLOW}MAX_TIMEOUT=600 ./test-improved/scripts/run-integration-tests.sh${NC}"
  exit $TEST_RESULT
fi
