#!/bin/bash
# Script to run simplified tests without Neovim integration dependency

# Import common utilities
source "$(dirname "$0")/../../utils/output.sh"

# Display working directory for debugging
echo "Working directory: $(pwd)"

# Colors for display
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to display header
print_header() {
  echo -e "\n${BLUE}   Simplified Tests for coc-vue   ${NC}"
  echo -e "${BLUE}================================${NC}\n"
}

# Function to display information messages
print_info() {
  echo -e "${YELLOW}$1${NC}"
}

# Function to display success messages
print_success() {
  echo -e "${GREEN}$1${NC}"
}

# Function to display error messages
print_error() {
  echo -e "${RED}$1${NC}"
}

# Function to clean up resources
cleanup() {
  # Kill any remaining Jest processes
  pkill -f "jest" 2>/dev/null
  
  # Clean up temporary files
  rm -f /tmp/test-*.log 2>/dev/null
  rm -rf /tmp/test-results 2>/dev/null
  
  exit ${1:-$?}
}

# Clean up temporary files
cleanup_temp_files() {
  rm -f /tmp/test-*.log 2>/dev/null
  rm -rf /tmp/test-results 2>/dev/null
}

# Function to run unit tests
run_unit_tests() {
  print_info "Running unit tests with mocks..."
  
  # Run unit tests with Jest and simplified configuration
  npx jest --config ./test-improved/jest.config.js \
    --testPathPattern="__tests__/(?!integration)" \
    --passWithNoTests \
    "$@"
  
  local result=$?
  
  if [ $result -eq 0 ]; then
    print_success "✓ Unit tests passed!"
  else
    print_error "✗ Unit tests failed."
  fi
  
  return $result
}

# Function to run component tests
run_component_tests() {
  print_info "Running component tests with mocks..."
  
  # Run component tests with Jest and simplified configuration
  npx jest --config ./test-improved/jest.config.js \
    --testPathPattern="__tests__/components" \
    --passWithNoTests \
    "$@"
  
  local result=$?
  
  if [ $result -eq 0 ]; then
    print_success "✓ Component tests passed!"
  else
    print_error "✗ Component tests failed."
  fi
  
  return $result
}

# Function to run simplified integration tests
run_integration_tests() {
  print_info "Running simplified integration tests..."
  
  # Run integration tests with Jest and simplified configuration
  npx jest --config ./test-improved/jest.config.js \
    --testPathPattern="__tests__/integration" \
    --passWithNoTests \
    "$@"
  
  local result=$?
  
  if [ $result -eq 0 ]; then
    print_success "✓ Integration tests passed!"
  else
    print_error "✗ Integration tests failed."
  fi
  
  return $result
}

# Main function
main() {
  # Configure trap for cleanup on interruption
  trap cleanup SIGINT SIGTERM
  
  # Display header
  print_header
  
  # Run tests
  run_unit_tests "$@"
  local unit_result=$?
  
  run_component_tests "$@"
  local component_result=$?
  
  run_integration_tests "$@"
  local integration_result=$?
  
  # Display summary
  echo -e "\n${BLUE}=== Test Summary ====${NC}"
  [ $unit_result -eq 0 ] && echo -e "${GREEN}✓ Unit tests: PASSED${NC}" || echo -e "${RED}✗ Unit tests: FAILED (code $unit_result)${NC}"
  [ $component_result -eq 0 ] && echo -e "${GREEN}✓ Component tests: PASSED${NC}" || echo -e "${RED}✗ Component tests: FAILED (code $component_result)${NC}"
  [ $integration_result -eq 0 ] && echo -e "${GREEN}✓ Integration tests: PASSED${NC}" || echo -e "${RED}✗ Integration tests: FAILED (code $integration_result)${NC}"
  
  # Clean up
  cleanup_temp_files
  
  # Return overall result
  [ $unit_result -eq 0 ] && [ $component_result -eq 0 ] && [ $integration_result -eq 0 ]
  return $?
}

# Execute main function
main "$@"
