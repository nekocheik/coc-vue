#!/bin/bash
# run-all-tests.sh
# Main script to run all tests

# Import common utilities
source "$(dirname "${BASH_SOURCE[0]}")/core/test-utils.sh"

# Global variables
RUN_UNIT=${RUN_UNIT:-true}
RUN_INTEGRATION=${RUN_INTEGRATION:-true}
RUN_COMPONENT=${RUN_COMPONENT:-false}
RUN_COMMAND=${RUN_COMMAND:-false}
RUN_PING=${RUN_PING:-false}

# Variables to store test results
UNIT_EXIT_CODE=0
INTEGRATION_EXIT_CODE=0
COMPONENT_EXIT_CODE=0
COMMAND_EXIT_CODE=0
PING_EXIT_CODE=0

# Variables to store test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Cleanup function on exit
cleanup() {
  print_info "Cleaning up resources..."
  
  # Clean up ports used by tests
  "$PROJECT_ROOT/scripts/test/utils/cleanup-ports.sh"
  
  print_success "Cleanup completed."
}

# Function to run a specific test
run_test() {
  local test_type=$1
  local script_path=$2
  local description=$3
  shift 3
  
  print_header "Running tests: $description"
  
  # Run the test script
  "$script_path" "$@"
  local exit_code=$?
  
  # Store the result
  case "$test_type" in
    "unit")
      UNIT_EXIT_CODE=$exit_code
      ;;
    "integration")
      INTEGRATION_EXIT_CODE=$exit_code
      ;;
    "component")
      COMPONENT_EXIT_CODE=$exit_code
      ;;
    "command")
      COMMAND_EXIT_CODE=$exit_code
      ;;
    "ping")
      PING_EXIT_CODE=$exit_code
      ;;
  esac
  
  if [ $exit_code -eq 0 ]; then
    print_success "✓ $description: Passed"
    ((TESTS_PASSED++))
  else
    print_error "✗ $description: Failed"
    ((TESTS_FAILED++))
  fi
  
  return $exit_code
}

# Function to show test summary
show_summary() {
  print_header "TEST SUMMARY"
  echo "Tests passed: $TESTS_PASSED"
  echo "Tests failed: $TESTS_FAILED"
  echo "Tests skipped: $TESTS_SKIPPED"
  echo "Total tests: $((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))"
  
  if [ $TESTS_FAILED -eq 0 ]; then
    print_success "✓ All tests passed!"
  else
    print_error "✗ Some tests failed."
    print_info "For more details, run individual tests with VERBOSE_LOGS=true:"
    print_info "VERBOSE_LOGS=true ./scripts/test/runners/run-unit-tests.sh"
    print_info "VERBOSE_LOGS=true ./scripts/test/runners/run-integration-tests.sh"
  fi
}

# Function to parse arguments
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --unit-only)
        RUN_UNIT=true
        RUN_INTEGRATION=false
        RUN_COMPONENT=false
        RUN_COMMAND=false
        RUN_PING=false
        shift
        ;;
      --integration-only)
        RUN_UNIT=false
        RUN_INTEGRATION=true
        RUN_COMPONENT=false
        RUN_COMMAND=false
        RUN_PING=false
        shift
        ;;
      --component)
        RUN_COMPONENT=true
        shift
        ;;
      --command)
        RUN_COMMAND=true
        shift
        ;;
      --ping)
        RUN_PING=true
        shift
        ;;
      --all)
        RUN_UNIT=true
        RUN_INTEGRATION=true
        RUN_COMPONENT=true
        RUN_COMMAND=true
        RUN_PING=true
        shift
        ;;
      --help)
        show_help
        exit 0
        ;;
      --verbose)
        VERBOSE_LOGS=true
        shift
        ;;
      *)
        # If argument doesn't start with --, consider it as a test pattern
        if [[ ! $1 == --* && -n $1 ]]; then
          TEST_PATTERN="$1"
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
  
  # Clean up ports before starting
  print_info "Initial cleanup of test ports..."
  "$PROJECT_ROOT/scripts/test/utils/cleanup-ports.sh"
  
  # Set up trap for cleanup on interruption
  trap cleanup EXIT INT TERM
  
  # Run unit tests if requested
  if [ "$RUN_UNIT" = true ]; then
    run_test "unit" "$PROJECT_ROOT/scripts/test/runners/run-unit-tests.sh" "Unit tests" "$@"
  fi
  
  # Run integration tests if requested
  if [ "$RUN_INTEGRATION" = true ]; then
    run_test "integration" "$PROJECT_ROOT/scripts/test/runners/run-integration-tests.sh" "Integration tests" "$@"
  fi
  
  # Run component tests if requested
  if [ "$RUN_COMPONENT" = true ]; then
    run_test "component" "$PROJECT_ROOT/scripts/test/runners/run-component-tests.sh" "Component tests" "$@"
  fi
  
  # Run command tests if requested
  if [ "$RUN_COMMAND" = true ]; then
    run_test "command" "$PROJECT_ROOT/scripts/test/runners/run-command-tests.sh" "Command tests" "$@"
  fi
  
  # Run ping tests if requested
  if [ "$RUN_PING" = true ]; then
    run_test "ping" "$PROJECT_ROOT/scripts/test/runners/run-ping-tests.sh" "Ping tests" "$@"
  fi
  
  # Show test summary
  show_summary
  
  # Determine global exit code
  if [ "$RUN_UNIT" = true ] && [ $UNIT_EXIT_CODE -ne 0 ]; then
    return 1
  fi
  
  if [ "$RUN_INTEGRATION" = true ] && [ $INTEGRATION_EXIT_CODE -ne 0 ]; then
    return 1
  fi
  
  if [ "$RUN_COMPONENT" = true ] && [ $COMPONENT_EXIT_CODE -ne 0 ]; then
    return 1
  fi
  
  if [ "$RUN_COMMAND" = true ] && [ $COMMAND_EXIT_CODE -ne 0 ]; then
    return 1
  fi
  
  if [ "$RUN_PING" = true ] && [ $PING_EXIT_CODE -ne 0 ]; then
    return 1
  fi
  
  return 0
}

# Run main function with arguments
main "$@"
