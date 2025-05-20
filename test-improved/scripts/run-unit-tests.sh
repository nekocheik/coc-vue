#!/bin/bash

# Script to run unit tests with optimized configuration
# Added timeout mechanism to avoid deadlocks

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Define global timeout (in seconds)
MAX_TIMEOUT=${MAX_TIMEOUT:-120}  # 2 minutes default for unit tests

echo -e "${BLUE}=== Running COC-Vue Unit Tests ===${NC}"
echo -e "${YELLOW}Starting tests...${NC}"
echo -e "${YELLOW}Timeout set to ${MAX_TIMEOUT} seconds${NC}"

# Function to clean up processes on exit
cleanup() {
  echo -e "\n${YELLOW}Cleaning up processes...${NC}"
  # Tuer le processus Jest s'il est toujours en cours d'exécution
  if [ -n "$JEST_PID" ]; then
    echo -e "${YELLOW}Force stopping Jest...${NC}"
    kill -9 $JEST_PID 2>/dev/null
  fi
}

# Configure trap for cleanup on interruption
trap cleanup EXIT INT TERM

# Run unit tests with Jest in background
VERBOSE_LOGS=${VERBOSE_LOGS:-false} npx jest --config ./test-improved/jest.config.js --selectProjects UNIT "$@" &
JEST_PID=$!

# Monitor Jest process with timeout
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
  
  # Show a dot every 5 seconds to indicate script is still active
  if [ $((ELAPSED % 5)) -eq 0 ]; then
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
  echo -e "\n${GREEN}✓ All unit tests passed!${NC}"
else
  echo -e "\n${RED}✗ Some unit tests failed.${NC}"
  echo -e "${YELLOW}To see detailed logs, run with VERBOSE_LOGS=true:${NC}"
  echo -e "${YELLOW}VERBOSE_LOGS=true ./test-improved/scripts/run-unit-tests.sh${NC}"
fi

exit $EXIT_CODE
