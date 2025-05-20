#!/bin/bash

# Script to run tests in "watch" mode
# This script is useful during development to see test results in real-time

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Mode Watch for COC-Vue Tests ===${NC}"
echo -e "${YELLOW}Tests will be automatically re-executed when files are modified.${NC}"
echo -e "${YELLOW}Press 'q' to quit, 'p' to filter by file name.${NC}"
echo

# By default, run unit tests in watch mode
# Integration tests are not run in watch mode as they require a Neovim server
TEST_TYPE=${1:-"unit"}

if [ "$TEST_TYPE" = "unit" ]; then
  echo -e "${GREEN}Running unit tests in watch mode...${NC}"
  npx jest --config ./test-improved/jest.config.js --selectProjects UNIT --watch "$@"
elif [ "$TEST_TYPE" = "integration" ]; then
  echo -e "${YELLOW}Warning: Integration tests in watch mode require a running Neovim server.${NC}"
  echo -e "${YELLOW}Make sure the test server is running before proceeding.${NC}"
  echo -e "${GREEN}Running integration tests in watch mode...${NC}"
  npx jest --config ./test-improved/jest.config.js --selectProjects INTEGRATION --watch "$@"
else
  echo -e "${RED}Please specify test type: unit or integration${NC}"
  echo -e "${YELLOW}Usage: $0 <unit|integration>${NC}"
  exit 1
fi
