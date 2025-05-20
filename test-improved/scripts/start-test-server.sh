#!/bin/bash
# Script to start and verify mock server for tests

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Chemin vers la racine du projet
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}=== Starting mock server for tests ===${NC}"

# Clean up existing processes
echo -e "\n${YELLOW}Cleaning up processes...${NC}"

if lsof -i :9999 > /dev/null 2>&1; then
  echo -e "${YELLOW}Stopping all processes on port 9999...${NC}"
  kill -9 $(lsof -t -i:9999) 2>/dev/null
  sleep 2
  
  # Check if server is stopped
  if ! lsof -i :9999 > /dev/null 2>&1; then
    echo -e "${GREEN}Mock server stopped successfully.${NC}"
  else
    echo -e "${RED}Could not stop all processes on port 9999.${NC}"
    exit 1
  fi
fi

# Check if a server is already running
if lsof -i :9999 > /dev/null 2>&1; then
  echo -e "${YELLOW}A server is already running on port 9999. Stopping...${NC}"
  kill -9 $(lsof -t -i:9999) 2>/dev/null
  sleep 2
fi

# Start Node.js mock server in background
echo -e "${YELLOW}Starting Node.js mock server...${NC}"
node ./test-improved/scripts/mock-server.js > /tmp/mock-server.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready and verify it's operational
for i in $(seq 1 10); do
  # Wait 2 seconds for server to start
  sleep 2
  
  # Check if server is accessible with our verification script
  if node ./test-improved/scripts/test-server-status.js > /dev/null 2>&1; then
    echo -e "\n${GREEN}Mock server started and operational on port 9999.${NC}"
    # Wait 1 more second to ensure server is fully initialized
    sleep 1
    exit 0
  fi
  
  echo -n "."
done

echo -e "\n${RED}ERROR: Mock server not operational after 10 attempts.${NC}"
echo -e "${RED}Check /tmp/mock-server.log for details.${NC}"
exit 1
