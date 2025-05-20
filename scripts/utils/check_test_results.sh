#!/bin/bash
# Script to intelligently analyze integration test results

# Colors for display
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Temporary file to store test results
TEMP_FILE="/tmp/test_results.txt"

# Function to display header
print_header() {
  echo -e "${BLUE}================================${NC}"
  echo -e "${BLUE}   Test Results Analysis   ${NC}"
  echo -e "${BLUE}================================${NC}"
}

# Function to check if tests ran successfully
check_test_success() {
  local content="$1"
  
  # Search for success/failure patterns with regular expressions
  if echo "$content" | grep -q "Test Suites: [0-9]\\+ passed"; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    return 0
  elif echo "$content" | grep -q "Test Suites: [0-9]\\+ failed"; then
    local failed_count=$(echo "$content" | grep -o "Test Suites: [0-9]\\+ failed" | grep -o "[0-9]\\+")
    echo -e "${RED}✗ ${failed_count} test suites failed.${NC}"
    return 1
  else
    echo -e "${YELLOW}? Unable to determine if all tests passed.${NC}"
    return 2
  fi
}

# Function to extract and display test statistics
print_test_stats() {
  local content="$1"
  
  # Extract number of passed/failed/skipped tests
  local total=$(echo "$content" | grep -o "Tests: *[0-9]\\+" | grep -o "[0-9]\\+")
  local passed=$(echo "$content" | grep -o "passed, *[0-9]\\+" | grep -o "[0-9]\\+")
  local failed=$(echo "$content" | grep -o "failed, *[0-9]\\+" | grep -o "[0-9]\\+")
  
  # Calculate success rate
  if [ -n "$total" ] && [ -n "$passed" ]; then
    local success_rate=$((passed * 100 / total))
    echo -e "  ${GREEN}Tests passed: ${passed}/${total} (${success_rate}%)${NC}"
  fi
  
  # Extract skipped tests
  local skipped=$(echo "$content" | grep -o "skipped, *[0-9]\\+" | grep -o "[0-9]\\+")
  if [ -n "$skipped" ]; then
    echo -e "  ${YELLOW}Tests skipped: ${skipped}${NC}"
  fi
  
  # Extract failed tests
  if [ -n "$failed" ] && [ "$failed" -gt 0 ]; then
    echo -e "  ${RED}Tests failed: ${failed}${NC}"
    echo "$content" | grep -A 2 "^FAIL" || true
  fi
}

# Function to check for specific errors
check_specific_errors() {
  local content="$1"
  
  echo -e "\n${BLUE}Checking for specific errors:${NC}"
  
  # Check for connection errors
  if echo "$content" | grep -q "ECONNREFUSED"; then
    echo -e "  ${RED}✗ Connection error detected. Server might not be running.${NC}"
    echo -e "    ${YELLOW}Tip: Check that port 9999 is free and the server is running.${NC}"
  fi
  
  # Check for timeout errors
  if echo "$content" | grep -q "Timeout - Async callback was not invoked within"; then
    echo -e "  ${RED}✗ Test timeout detected.${NC}"
    echo -e "    ${YELLOW}Tip: Consider increasing the timeout value or optimizing the tests.${NC}"
  fi
  
  # Check for syntax errors
  if echo "$content" | grep -q "SyntaxError"; then
    echo -e "  ${RED}✗ Syntax error detected in tests.${NC}"
    echo -e "    ${YELLOW}Tip: Check the test files for syntax errors.${NC}"
  fi
}

# Main execution
if [ -f "$TEMP_FILE" ]; then
  content=$(cat "$TEMP_FILE")
  print_header
  check_test_success "$content"
  echo
  print_test_stats "$content"
  check_specific_errors "$content"
else
  echo -e "${RED}Error: Test results file not found at ${TEMP_FILE}${NC}"
  exit 1
fi
