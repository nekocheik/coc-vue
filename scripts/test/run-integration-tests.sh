#!/bin/bash
# Script to run integration tests with dynamic port system

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVER_PID=""
JEST_PID=""

# Set global timeout (in seconds)
MAX_TIMEOUT=${MAX_TIMEOUT:-300}  # 5 minutes default

echo -e "${BLUE}=== Running COC-Vue Integration Tests ===${NC}"
echo -e "${YELLOW}Timeout set to ${MAX_TIMEOUT} seconds${NC}"

# Function to clean up processes on exit
cleanup() {
  local force=$1

  # Stop mock server
  if [ -n "$SERVER_PID" ]; then
    echo -e "${YELLOW}Stopping mock server (PID: $SERVER_PID)...${NC}"
    kill $SERVER_PID 2>/dev/null

    # Check if process is still running
    if [ "$force" = "true" ] && kill -0 $SERVER_PID 2>/dev/null; then
      echo -e "${YELLOW}Force stopping mock server...${NC}"
      kill -9 $SERVER_PID 2>/dev/null
    fi
  fi

  # Kill Jest process if still running
  if [ -n "$JEST_PID" ]; then
    echo -e "${YELLOW}Stopping Jest process (PID: $JEST_PID)...${NC}"
    kill $JEST_PID 2>/dev/null

    # Check if process is still running
    if [ "$force" = "true" ] && kill -0 $JEST_PID 2>/dev/null; then
      echo -e "${YELLOW}Force stopping Jest...${NC}"
      kill -9 $JEST_PID 2>/dev/null
    fi
  fi

  # Free used ports
  rm -f .server-info.json

  echo -e "${GREEN}Cleanup completed.${NC}"
}

# Set up trap to clean up on interruption
trap 'cleanup true' EXIT INT TERM

# Start mock server with our script
echo -e "${YELLOW}Starting mock server for tests...${NC}"
node scripts/test/mock-server.js &
SERVER_PID=$!

# Wait for server to be ready (check .server-info.json file)
echo -e "${YELLOW}Waiting for server to start...${NC}"
MAX_WAIT=30
for ((i=1; i<=MAX_WAIT; i++)); do
  if [ -f .server-info.json ]; then
    SERVER_PORT=$(grep -o '"port":[0-9]\+' .server-info.json | grep -o '[0-9]\+')
    echo -e "${GREEN}Mock server started on port $SERVER_PORT.${NC}"
    break
  fi

  # If we reach the last attempt, fail
  if [ $i -eq $MAX_WAIT ]; then
    echo -e "${RED}ERROR: Mock server did not start after $MAX_WAIT seconds.${NC}"
    echo -e "${YELLOW}Check logs in /tmp/mock-server.log for details.${NC}"
    cleanup true
    exit 1
  fi

  sleep 1
done

# Export server port for tests
export MOCK_SERVER_PORT=$SERVER_PORT

echo -e "${YELLOW}Running integration tests...${NC}"

# Run integration tests with Jest in background
npx jest --config ./test/integration-jest.config.js &
JEST_PID=$!

# Monitor Jest process with timeout
SECONDS=0
EXIT_CODE=""

# Check if timeout is reached
while [ $SECONDS -lt $MAX_TIMEOUT ]; do
  if ! kill -0 $JEST_PID 2>/dev/null; then
    break
  fi

  # Wait 1 second and increment counter
  sleep 1

  # Show a dot every 10 seconds to show script is still active
  if [ $((SECONDS % 10)) -eq 0 ]; then
    echo -n "."
  fi
done

# If Jest is still running after timeout
if kill -0 $JEST_PID 2>/dev/null; then
  echo -e "\n${RED}ERROR: Tests exceeded timeout of ${MAX_TIMEOUT} seconds.${NC}"
  echo -e "${RED}Force stopping tests...${NC}"
  EXIT_CODE=124
  cleanup true
fi

# Wait for Jest to finish (if not killed)
wait $JEST_PID
JEST_EXIT=$?

# If EXIT_CODE is not set (no timeout), use Jest's exit code
if [ -z "$EXIT_CODE" ]; then
  EXIT_CODE=$JEST_EXIT
fi

# Clean up processes
cleanup false

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "\n${GREEN}✓ All integration tests passed!${NC}"
else
  echo -e "\n${RED}✗ Some integration tests failed.${NC}"
  echo -e "${YELLOW}To see detailed logs, run with VERBOSE_LOGS=true:${NC}"
  echo "VERBOSE_LOGS=true npm run test:integration"
fi

exit $EXIT_CODE
