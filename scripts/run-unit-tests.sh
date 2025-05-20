#!/bin/bash

# Script to run unit tests that don't depend on Neovim
# with a 48-second timeout

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

# Unit tests that can run without Neovim
log "${BLUE}=== Running basic unit tests ====${NC}"
run_with_timeout "npx jest --config ./test/simplified-jest.config.js" 48
test_result=$?

# Show summary
log "${BLUE}=== Test Summary ====${NC}"
if [ $test_result -eq 0 ]; then
  log "${GREEN}✓ All tests passed${NC}"
  exit 0
else
  log "${RED}✗ Some tests failed${NC}"
  exit $test_result
fi
