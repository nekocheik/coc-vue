#!/bin/bash
# Script to run component tests

# Usage:
#   ./scripts/test/runners/run-component-tests.sh                  # Run all tests
#   ./scripts/test/runners/run-component-tests.sh --section <n> # Run a specific section
#   ./scripts/test/runners/run-component-tests.sh --progressive    # Run tests progressively

# Test sections:
#   button            - Button component tests
#   input             - Input component tests
#   select            - Select component tests
#   modal            - Modal component tests
#   error-handling    - Error handling tests
#   events           - Event system tests
#   validation       - Input validation tests
#   accessibility    - Accessibility tests
#   performance      - Performance tests
#   integration      - Integration tests

# Import common utilities
source "$(dirname "${BASH_SOURCE[0]}")/../core/test-utils.sh"

# Set global timeout (in seconds)
MAX_TIMEOUT=${MAX_TIMEOUT:-300}  # 5 minutes by default

# Global variables
PROGRESSIVE_MODE=false
SECTION=""

# Cleanup function on exit
cleanup() {
  print_info "Cleaning up resources..."
  
  # Stop the component server
  if [ -n "$SERVER_PID" ]; then
    kill_process $SERVER_PID
  fi
  
  # Clean up Neovim processes
  pkill -f "nvim --headless" || true
  
  # Clean up port 9999
  cleanup_port 9999
  
  print_success "Cleanup completed."
}

# Function to run a specific test or test pattern
run_test() {
  local test_pattern=$1
  local description=$2
  
  print_info "Running test: $description"
  print_debug "Test pattern: $test_pattern"
  
  # Run the test with Jest
  VERBOSE_LOGS=${VERBOSE_LOGS:-false} npx jest --config ./test/jest.config.js --testPathPattern="$test_pattern"
  local result=$?
  
  if [ $result -eq 0 ]; then
    print_success "✓ Test passed: $description"
  else
    print_error "✗ Test failed: $description"
  fi
  
  return $result
}

# Function to run tests in progressive mode
run_progressive_tests() {
  print_header "Component tests in progressive mode"
  
  local all_passed=true
  local sections=(
    "button:Button component tests"
    "input:Input component tests"
    "select:Select component tests"
    "modal:Modal component tests"
    "error-handling:Error handling tests"
    "events:Event system tests"
    "validation:Input validation tests"
    "accessibility:Accessibility tests"
    "performance:Performance tests"
    "integration:Integration tests"
  )
  
  for section_info in "${sections[@]}"; do
    IFS=':' read -r section_name section_desc <<< "$section_info"
    
    print_info "=== Section: $section_desc ==="
    
    if ! run_test "$section_name" "$section_desc"; then
      all_passed=false
      print_error "Section '$section_desc' failed. Do you want to continue with the next sections? (y/n)"
      read -r continue_tests
      
      if [[ ! $continue_tests =~ ^[Yy]$ ]]; then
        print_info "Tests interrupted by user."
        return 1
      fi
    fi
    
    # Pause between sections
    print_info "2 second pause before next section..."
    sleep 2
  done
  
  if [ "$all_passed" = true ]; then
    print_success "✓ All component tests passed!"
    return 0
  else
    print_error "✗ Some component tests failed."
    return 1
  fi
}

# Function to run a specific test section
run_section_tests() {
  local section=$1
  
  print_header "Component tests - Section: $section"
  
  if ! run_test "$section" "Section $section"; then
    print_error "✗ Section '$section' failed."
    return 1
  fi
  
  print_success "✓ Section '$section' passed!"
  return 0
}

# Function to run all component tests
run_all_tests() {
  print_header "Component tests - All tests"
  
  # Run all component tests
  VERBOSE_LOGS=${VERBOSE_LOGS:-false} npx jest --config ./test/jest.config.js --testPathPattern="components"
  local result=$?
  
  if [ $result -eq 0 ]; then
    print_success "✓ All component tests passed!"
  else
    print_error "✗ Some component tests failed."
  fi
  
  return $result
}

# Function to start the component server
start_component_server() {
  print_info "Starting component server..."
  
  # Clean up existing Neovim processes
  print_info "Cleaning up existing Neovim processes..."
  pkill -f "nvim --headless" || true
  
  # Check if port 9999 is already in use
  if lsof -i :9999 > /dev/null 2>&1; then
    print_error "Port 9999 is already in use. Cleaning up existing processes..."
    cleanup_port 9999
    sleep 2
  fi
  
  # Create a log file for the server
  LOG_FILE="/tmp/component-server.log"
  touch "$LOG_FILE"
  chmod 666 "$LOG_FILE" 2>/dev/null || true
  
  # Start the component server directly (without using start_server)
  print_info "Starting Neovim with component server..."
  "$PROJECT_ROOT/scripts/server/run_component_server.sh" > "$LOG_FILE" 2>&1 &
  SERVER_PID=$!
  
  # Wait for the server to be ready
  print_info "Waiting for component server to start..."
  
  # Wait up to 15 seconds for the server to start
  for i in {1..15}; do
    if grep -q "Component server running on 127.0.0.1:9999" "$LOG_FILE" 2>/dev/null; then
      print_success "Component server started successfully!"
      break
    fi
    
    # Check if the process is still running
    if ! ps -p $SERVER_PID > /dev/null; then
      print_error "Component server process stopped unexpectedly."
      print_info "Log contents:"
      cat "$LOG_FILE"
      return 1
    fi
    
    echo -n "."
    sleep 1
  done
  
  # Check if the server is listening on port 9999
  if ! lsof -i :9999 > /dev/null 2>&1; then
    print_error "Component server is not listening on port 9999."
    print_info "Log contents:"
    cat "$LOG_FILE"
    return 1
  fi
  
  print_success "Component server started successfully (PID: $SERVER_PID)."
  return 0
}

# Function to parse arguments
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --progressive)
        PROGRESSIVE_MODE=true
        shift
        ;;
      --section)
        SECTION="$2"
        shift 2
        ;;
      *)
        # If argument doesn't start with --, consider it as a section
        if [[ ! $1 == --* && -n $1 ]]; then
          SECTION="$1"
        fi
        shift
        ;;
    esac
  done
}

# Main function
main() {
  # Parse arguments
  parse_args "$@"
  
  # Check prerequisites
  check_prerequisites "node" "npx" "jest" "lsof"
  
  # Set up trap for cleanup on interruption
  trap cleanup EXIT INT TERM
  
  # Start the component server
  if ! start_component_server; then
    return 1
  fi
  
  # Run tests according to mode
  if [ "$PROGRESSIVE_MODE" = true ]; then
    run_progressive_tests
  elif [ -n "$SECTION" ]; then
    run_section_tests "$SECTION"
  else
    run_all_tests
  fi
  
  return $?
}

# Execute main function with arguments
main "$@"
