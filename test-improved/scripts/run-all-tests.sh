#!/bin/bash

# Main script to run all tests
# This script runs unit and integration tests in sequence
# Add a global timeout mechanism to prevent blocking

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Define timeouts for each test type (in seconds)
UNIT_TIMEOUT=${UNIT_TIMEOUT:-120}    # 2 minutes default for unit tests
INTEGRATION_TIMEOUT=${INTEGRATION_TIMEOUT:-300}  # 5 minutes default for integration tests
GLOBAL_TIMEOUT=${GLOBAL_TIMEOUT:-600}  # 10 minutes default for all tests

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}=== COC-Vue Complete Test Suite ===${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "${YELLOW}Global Timeout: $(show_time $GLOBAL_TIMEOUT)${NC}"

# Create reports directory if it doesn't exist
REPORT_DIR="./test-improved/reports"
mkdir -p $REPORT_DIR

# Function to display elapsed time
function show_time() {
  local T=$1
  local H=$((T/3600))
  local M=$(((T%3600)/60))
  local S=$((T%60))
  
  if [ $H -gt 0 ]; then
    printf "%dh %dm %ds" $H $M $S
  elif [ $M -gt 0 ]; then
    printf "%dm %ds" $M $S
  else
    printf "%ds" $S
  fi
}

# Function to monitor global timeout and stop tests if necessary
function monitor_timeout() {
  local start_time=$1
  local timeout=$2
  local elapsed=0
  
  while [ $elapsed -lt $timeout ]; do
    sleep 5
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))
    
    # Check if the main process is still running
    if ! ps -p $$ > /dev/null; then
      return 0
    fi
  done
  
  echo -e "\n${RED}ERROR: Tests exceeded the global timeout of $(show_time $timeout).${NC}"
  echo -e "${RED}Forcing stop of all test processes...${NC}"
  
  # Kill all running Jest processes
  pkill -f "jest" 2>/dev/null
  
  # Kill the main process (this script)
  kill -9 $$ 2>/dev/null
}

# Start global timeout monitoring in the background
START_TIME=$(date +%s)
monitor_timeout $START_TIME $GLOBAL_TIMEOUT &
MONITOR_PID=$!

# Function to clean up processes on exit
cleanup() {
  # Stop monitoring process
  if [ -n "$MONITOR_PID" ]; then
    kill $MONITOR_PID 2>/dev/null
  fi
  
  # Stop all running Jest processes
  pkill -f "jest" 2>/dev/null
}

# Configure trap to clean up in case of interruption
trap cleanup EXIT INT TERM

echo -e "${CYAN}[1/2] Running unit tests...${NC}"
MAX_TIMEOUT=$UNIT_TIMEOUT ./test-improved/scripts/run-unit-tests.sh --json --outputFile=$REPORT_DIR/unit-results.json
UNIT_EXIT_CODE=$?

echo -e "${CYAN}[2/2] Running integration tests...${NC}"
MAX_TIMEOUT=$INTEGRATION_TIMEOUT ./test-improved/scripts/run-integration-tests.sh --json --outputFile=$REPORT_DIR/integration-results.json
INTEGRATION_EXIT_CODE=$?

# Stop global timeout monitoring
kill $MONITOR_PID 2>/dev/null

# Calculate total time
END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}=== COC-Vue Test Summary        ===${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "${YELLOW}Total Execution Time: $(show_time $TOTAL_TIME)${NC}"
echo

if [ $UNIT_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ Unit Tests: Passed${NC}"
else
  echo -e "${RED}✗ Unit Tests: Failed${NC}"
fi

if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ Integration Tests: Passed${NC}"
else
  echo -e "${RED}✗ Integration Tests: Failed${NC}"
fi

echo

# Generate coverage report with timeout
echo -e "${YELLOW}Generating code coverage report...${NC}"
timeout 60s npx jest --config ./test-improved/jest.config.js --coverage --coverageReporters="json-summary" --coverageDirectory=$REPORT_DIR/coverage
COVERAGE_EXIT_CODE=$?

if [ $COVERAGE_EXIT_CODE -eq 124 ]; then
  echo -e "${YELLOW}Coverage report generation interrupted (timeout).${NC}"
fi

# Display coverage summary
if [ -f "$REPORT_DIR/coverage/coverage-summary.json" ]; then
  echo -e "${BLUE}=======================================${NC}"
  echo -e "${BLUE}=== Code Coverage              ===${NC}"
  echo -e "${BLUE}=======================================${NC}"
  
  # Extract coverage statistics with jq (if available)
  if command -v jq &> /dev/null; then
    STATEMENTS=$(jq -r '.total.statements.pct' $REPORT_DIR/coverage/coverage-summary.json)
    BRANCHES=$(jq -r '.total.branches.pct' $REPORT_DIR/coverage/coverage-summary.json)
    FUNCTIONS=$(jq -r '.total.functions.pct' $REPORT_DIR/coverage/coverage-summary.json)
    LINES=$(jq -r '.total.lines.pct' $REPORT_DIR/coverage/coverage-summary.json)
    
    echo -e "${YELLOW}Statements: ${STATEMENTS}%${NC}"
    echo -e "${YELLOW}Branches:   ${BRANCHES}%${NC}"
    echo -e "${YELLOW}Functions:  ${FUNCTIONS}%${NC}"
    echo -e "${YELLOW}Lines:      ${LINES}%${NC}"
  else
    echo -e "${YELLOW}Install jq to see detailed coverage statistics${NC}"
    echo -e "${YELLOW}Full report available in: $REPORT_DIR/coverage${NC}"
  fi
fi

echo
echo -e "${BLUE}=======================================${NC}"
echo -e "${YELLOW}Used Timeout Parameters:${NC}"
echo -e "${YELLOW}- Unit Tests:      $(show_time $UNIT_TIMEOUT)${NC}"
echo -e "${YELLOW}- Integration Tests: $(show_time $INTEGRATION_TIMEOUT)${NC}"
echo -e "${YELLOW}- Global Timeout:   $(show_time $GLOBAL_TIMEOUT)${NC}"
echo -e "${YELLOW}To modify timeouts:${NC}"
echo -e "${YELLOW}UNIT_TIMEOUT=180 INTEGRATION_TIMEOUT=360 GLOBAL_TIMEOUT=900 ./test-improved/scripts/run-all-tests.sh${NC}"
echo -e "${BLUE}=======================================${NC}"

# Determine global exit code
if [ $UNIT_EXIT_CODE -eq 0 ] && [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed.${NC}"
  exit 1
fi
