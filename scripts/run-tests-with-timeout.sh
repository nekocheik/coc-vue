#!/bin/bash

# Script to run tests with a 48-second timeout
# Usage: ./run-tests-with-timeout.sh [test-command]

# Colors for messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display messages
log() {
  echo -e "$1"
}

# Function to execute a command with timeout (macOS compatible)
run_with_timeout() {
  local cmd="$1"
  local timeout_seconds="$2"
  
  log "${YELLOW}Executing command:${NC} $cmd"
  log "${YELLOW}Timeout set to:${NC} $timeout_seconds seconds"
  
  # Use perl to create a timer that will send a TERM signal to the process
  perl -e '
    $timeout = shift;
    $pid = fork;
    if ($pid == 0) {
      sleep $timeout;
      kill("TERM", getppid);
      exit 1;
    }
  ' "$timeout_seconds" &
  timer_pid=$!
  
  # Execute command in background
  eval "$cmd" &
  cmd_pid=$!
  
  # Use perl to wait for specified number of seconds
  wait $cmd_pid
  exit_code=$?
  
  # If command completed, stop the timer
  kill $timer_pid 2>/dev/null
  wait $timer_pid 2>/dev/null
  
  if [ $exit_code -eq 143 ]; then  # SIGTERM
    log "${RED}TIMEOUT!${NC} Command exceeded $timeout_seconds seconds and will be interrupted."
    return 1
  elif [ $exit_code -ne 0 ]; then
    log "${RED}FAILURE!${NC} Command failed with exit code $exit_code."
    return $exit_code
  else
    log "${GREEN}SUCCESS!${NC} Command completed successfully."
    return 0
  fi
}

# Check if a command was provided
if [ $# -eq 0 ]; then
  log "No command specified. Using default test commands."
  
  # Run standard unit tests
  log "${BLUE}=== Running unit tests ====${NC}"
  run_with_timeout "npx jest --config ./test/simplified-jest.config.js" 48
  unit_test_result=$?
  
  # Run bridge integration tests
  log "${BLUE}=== Running bridge integration tests ====${NC}"
  run_with_timeout "npx jest --config ./test/integration-jest.config.js --testPathPattern=bridge" 48
  bridge_test_result=$?
  
  # Run component integration tests
  log "${BLUE}=== Running component integration tests ====${NC}"
  run_with_timeout "npx jest --config ./test/integration-jest.config.js --testPathPattern=components" 48
  integration_test_result=$?
  
  # Show summary
  log "${BLUE}=== Test Summary ====${NC}"
  [ $unit_test_result -eq 0 ] && echo -e "${GREEN}✓ Unit tests: SUCCESS${NC}" || echo -e "${RED}✗ Unit tests: FAILURE (code $unit_test_result)${NC}"
  [ $bridge_test_result -eq 0 ] && echo -e "${GREEN}✓ Bridge integration tests: SUCCESS${NC}" || echo -e "${RED}✗ Bridge integration tests: FAILURE (code $bridge_test_result)${NC}"
  [ $integration_test_result -eq 0 ] && echo -e "${GREEN}✓ Component integration tests: SUCCESS${NC}" || echo -e "${RED}✗ Component integration tests: FAILURE (code $integration_test_result)${NC}"
  
  # Calculate overall result
  if [ $unit_test_result -eq 0 ] && [ $bridge_test_result -eq 0 ] && [ $integration_test_result -eq 0 ]; then
    log "${GREEN}All tests passed!${NC}"
    exit 0
  else
    log "${RED}Some tests failed.${NC}"
    exit 1
  fi
else
  # Run specified command with timeout
  run_with_timeout "$*" 48
  exit $?
fi
