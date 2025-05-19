#!/bin/bash
# scripts/run_component_tests.sh
# Script to run the component integration tests

# Set the path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting component integration tests...${NC}"

# Check if port 9999 is already in use
if lsof -i :9999 > /dev/null 2>&1; then
  echo -e "${RED}Port 9999 is already in use. Killing existing processes...${NC}"
  lsof -i :9999 -t | xargs kill -9
  sleep 2
fi

# Start the component server in the background
echo -e "${YELLOW}Starting component server...${NC}"
"$PROJECT_ROOT/scripts/run_component_server.sh" &
SERVER_PID=$!

# Wait for the server to start
echo -e "${YELLOW}Waiting for component server to start...${NC}"
sleep 5

# Function to clean up when the script exits
function cleanup {
  echo -e "${YELLOW}Cleaning up...${NC}"
  if ps -p $SERVER_PID > /dev/null; then
    echo -e "${YELLOW}Killing server process (PID: $SERVER_PID)${NC}"
    kill -9 $SERVER_PID
  fi
  echo -e "${GREEN}Cleanup complete${NC}"
}

# Register the cleanup function to be called on exit
trap cleanup EXIT

# Run the integration tests
echo -e "${GREEN}Running component integration tests...${NC}"
npx jest --verbose --runInBand __tests__/integration/select-component-integration.test.ts

# The exit code will be the exit code of the jest command
EXIT_CODE=$?

# Exit with the same code as the tests
exit $EXIT_CODE
