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

# Function to clean up processes on exit
cleanup() {
  echo -e "\n${YELLOW}Cleaning up processes...${NC}"
  
  # Stop Neovim server if we started it
  if [ -n "$SERVER_PID" ]; then
    echo -e "${YELLOW}Stopping Neovim server (PID: $SERVER_PID)...${NC}"
    kill $SERVER_PID 2>/dev/null
    sleep 1
    
    # Check if process is still running
    if kill -0 $SERVER_PID 2>/dev/null; then
      echo -e "${YELLOW}Force stopping Neovim server...${NC}"
      kill -9 $SERVER_PID 2>/dev/null
    fi
  fi
  
  # Make sure nothing is running on port 9999
  if lsof -i :9999 > /dev/null 2>&1; then
    echo -e "${YELLOW}Force stopping all processes on port 9999...${NC}"
    kill -9 $(lsof -t -i:9999) 2>/dev/null
  fi
  
  # Kill Jest process if it's still running
  if [ -n "$JEST_PID" ]; then
    echo -e "${YELLOW}Stopping Jest process (PID: $JEST_PID)...${NC}"
    kill $JEST_PID 2>/dev/null
    sleep 1
    
    # Check if process is still running
    if kill -0 $JEST_PID 2>/dev/null; then
      echo -e "${YELLOW}Force stopping Jest...${NC}"
      kill -9 $JEST_PID 2>/dev/null
    fi
  fi
  
  echo -e "${GREEN}Cleanup completed.${NC}"
}

# Configurer le trap pour nettoyer en cas d'interruption
trap cleanup EXIT INT TERM

# Start Neovim server with our dedicated script
echo -e "${YELLOW}Starting Neovim server for tests...${NC}"
./test-improved/scripts/start-test-server.sh
SERVER_STATUS=$?

# Check if server started correctly
if [ $SERVER_STATUS -ne 0 ]; then
  echo -e "${RED}ERROR: Neovim server could not start properly.${NC}"
  echo -e "${YELLOW}Check logs in /tmp/neovim-server.log for details.${NC}"
  exit 1
fi

# Capture server PID to stop it later
SERVER_PID=$(lsof -i :9999 -t)

echo -e "${YELLOW}Running integration tests...${NC}"

# Run integration tests with Jest in background
VERBOSE_LOGS=${VERBOSE_LOGS:-false} npx jest --config ./test-improved/jest.config.js --selectProjects INTEGRATION "$@" &
JEST_PID=$!

# Surveiller le processus Jest avec un timeout
ELAPSED=0
while kill -0 $JEST_PID 2>/dev/null; do
  # Check if timeout is reached
  if [ $ELAPSED -ge $MAX_TIMEOUT ]; then
    echo -e "\n${RED}ERROR: Tests exceeded timeout of ${MAX_TIMEOUT} seconds.${NC}"
    echo -e "${RED}Force stopping tests...${NC}"
    kill -9 $JEST_PID 2>/dev/null
    EXIT_CODE=1
    break
  fi
  
  # Wait 1 second and increment counter
  sleep 1
  ELAPSED=$((ELAPSED + 1))
  
  # Afficher un point toutes les 10 secondes pour montrer que le script est toujours actif
  if [ $((ELAPSED % 10)) -eq 0 ]; then
    echo -n "."
  fi
done

# Wait for Jest to finish (if not killed)
wait $JEST_PID 2>/dev/null
JEST_EXIT_CODE=$?

# If EXIT_CODE is not set (no timeout), use Jest exit code
if [ -z "$EXIT_CODE" ]; then
  EXIT_CODE=$JEST_EXIT_CODE
fi

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "\n${GREEN}✓ All integration tests passed!${NC}"
else
  echo -e "\n${RED}✗ Some integration tests failed.${NC}"
  echo -e "${YELLOW}To see detailed logs, run with VERBOSE_LOGS=true:${NC}"
  echo -e "${YELLOW}VERBOSE_LOGS=true ./test-improved/scripts/run-integration-tests.sh${NC}"
  echo -e "${YELLOW}To increase timeout, use MAX_TIMEOUT=<seconds>:${NC}"
  echo -e "${YELLOW}MAX_TIMEOUT=600 ./test-improved/scripts/run-integration-tests.sh${NC}"
fi

exit $EXIT_CODE
