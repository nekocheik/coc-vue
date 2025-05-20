#!/bin/bash
# Script to start and verify mock server for tests

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m'

# Default port for test server
PORT=${PORT:-3000}

echo -e "${BLUE}=== Starting mock server for tests ===${NC}"

# Check if server is already running
if [ -f "/tmp/mock-server.pid" ]; then
  PID=$(cat /tmp/mock-server.pid)
  if kill -0 $PID 2>/dev/null; then
    echo -e "${YELLOW}Mock server is already running with PID $PID${NC}"
    exit 0
  else
    echo -e "${YELLOW}Removing stale PID file${NC}"
    rm -f /tmp/mock-server.pid
  fi
fi

# Clean up any existing log files
rm -f /tmp/mock-server.log

# Start mock server in background
echo -e "${YELLOW}Starting mock server on port $PORT...${NC}"
PORT=$PORT node ./test-improved/scripts/mock-server.js > /tmp/mock-server.log 2>&1 &
SERVER_PID=$!

# Save PID for later cleanup
echo $SERVER_PID > /tmp/mock-server.pid

# Wait for server to start (max 30 seconds)
echo -e "${YELLOW}Waiting for server to start...${NC}"
ATTEMPTS=0
while [ $ATTEMPTS -lt 30 ]; do
  if node ./test-improved/scripts/test-server-status.js > /dev/null 2>&1; then
    echo -e "${GREEN}Mock server started successfully on port $PORT (PID: $SERVER_PID)${NC}"
    exit 0
  fi
  ATTEMPTS=$((ATTEMPTS + 1))
  sleep 1
done

# Server failed to start
echo -e "${RED}Failed to start mock server${NC}"
if [ -f "/tmp/mock-server.log" ]; then
  echo -e "${RED}Server logs:${NC}"
  cat /tmp/mock-server.log
fi

# Clean up
kill -9 $SERVER_PID 2>/dev/null
rm -f /tmp/mock-server.pid
exit 1
