#!/bin/bash
# run-unit-tests.sh
# Script to run unit tests with Jest

# Import common utilities
source "$(dirname "${BASH_SOURCE[0]}")/../core/test-utils.sh"

# Set global timeout (in seconds)
MAX_TIMEOUT=${MAX_TIMEOUT:-120}  # 2 minutes by default

# Cleanup function on exit
cleanup() {
  print_info "Cleaning up resources..."
  
  # Kill Jest process if it's still running
  if [ -n "$JEST_PID" ]; then
    kill_process $JEST_PID
  fi
  
  print_success "Cleanup completed."
}

# Main function
main() {
  # Display header
  print_header "Running COC-Vue unit tests"
  print_info "Timeout set to ${MAX_TIMEOUT} seconds"
  
  # Check prerequisites
  check_prerequisites "node" "npx" "jest"
  
  # Set up trap for cleanup on interruption
  trap cleanup EXIT INT TERM
  
  print_info "Starting unit tests..."
  
  # Build Jest command
  local jest_cmd="npx jest --config ./test/jest.config.js"
  
  # Add specific arguments
  if [ $# -eq 0 ]; then
    # If no arguments provided, select UNIT project
    jest_cmd="$jest_cmd --selectProjects UNIT"
  else
    # Otherwise, use provided arguments
    for arg in "$@"; do
      # Don't pass script-specific arguments to main script
      if [[ "$arg" != "--unit-only" && "$arg" != "--integration-only" && 
            "$arg" != "--component" && "$arg" != "--command" && 
            "$arg" != "--ping" && "$arg" != "--all" ]]; then
        jest_cmd="$jest_cmd $arg"
      fi
    done
  fi
  
  print_debug "Jest command: $jest_cmd"
  
  # Run unit tests with Jest in background
  VERBOSE_LOGS=${VERBOSE_LOGS:-false} eval "$jest_cmd" &
  JEST_PID=$!
  
  # Monitor Jest process with timeout
  local elapsed=0
  local interval=1
  while kill -0 $JEST_PID 2>/dev/null; do
    # Check if timeout is reached
    if [ $elapsed -ge $MAX_TIMEOUT ]; then
      print_error "ERROR: Tests exceeded timeout of ${MAX_TIMEOUT} seconds."
      print_error "Force stopping tests..."
      kill_process $JEST_PID true
      exit 1
    fi
    
    # Wait and increment counter
    sleep $interval
    elapsed=$((elapsed + interval))
    
    # Display a dot every 10 seconds to show script is still active
    if [ $((elapsed % 10)) -eq 0 ]; then
      echo -n "."
    fi
  done
  
  # Wait for Jest to finish (if not killed)
  wait $JEST_PID 2>/dev/null
  local exit_code=$?
  
  if [ $exit_code -eq 0 ]; then
    print_success "✓ All unit tests passed!"
  else
    print_error "✗ Some unit tests failed."
    print_info "To see detailed logs, run with VERBOSE_LOGS=true:"
    print_info "VERBOSE_LOGS=true ./scripts/test/runners/run-unit-tests.sh"
    print_info "To increase timeout, use MAX_TIMEOUT=<seconds>:"
    print_info "MAX_TIMEOUT=300 ./scripts/test/runners/run-unit-tests.sh"
  fi
  
  return $exit_code
}

# Run main function with arguments
main "$@"
