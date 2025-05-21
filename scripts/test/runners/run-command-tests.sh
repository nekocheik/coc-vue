#!/bin/bash
# run-command-tests.sh
# Script for running command tests (Neovim or Node)
#
# Usage:
#   ./scripts/test/runners/run-command-tests.sh              # Default Neovim mode
#   ./scripts/test/runners/run-command-tests.sh --node       # Node.js mode
#   ./scripts/test/runners/run-command-tests.sh --test <name> # Run a specific test

# Import common utilities
source "$(dirname "${BASH_SOURCE[0]}")/../core/test-utils.sh"

# Define global timeout (in seconds)
MAX_TIMEOUT=${MAX_TIMEOUT:-180}  # Default 3 minutes

# Global variables
MODE="neovim"  # Default mode: neovim
TEST_PATTERN=""

# Cleanup function on exit
cleanup() {
  print_info "Cleaning up resources..."
  
  # Stop command server
  if [ -n "$SERVER_PID" ]; then
    kill -9 "$SERVER_PID" 2>/dev/null || true
  fi
  
  # Clean up Neovim processes
  if [ "$MODE" = "neovim" ]; then
    pkill -f "nvim --headless" || true
  fi
  
  # Clean up used ports
  cleanup_port 9999
  
  print_success "Cleanup completed."
}

# Function to start command server in Neovim mode
start_neovim_server() {
  print_info "Starting Neovim command server..."
  
  # Clean up existing Neovim processes
  print_info "Cleaning up existing Neovim processes..."
  pkill -f "nvim --headless" || true
  
  # Check if port 9999 is already used
  if lsof -i :9999 > /dev/null 2>&1; then
    print_error "Port 9999 is already used. Cleaning up existing processes..."
    cleanup_port 9999
    sleep 2
  fi
  
  # Start Neovim command server
  SERVER_PID=$(start_server "$PROJECT_ROOT/scripts/server/run_command_server.sh" "/tmp/command-server.log")
  
  # Wait for server to be ready
  print_info "Waiting for Neovim server to start..."
  sleep 5
  
  # Check if server is running
  if ! ps -p $SERVER_PID > /dev/null; then
    print_error "Neovim server did not start correctly."
    print_info "Check logs in /tmp/command-server.log for more details."
    return 1
  fi
  
  print_success "Neovim server started successfully (PID: $SERVER_PID)."
  return 0
}

# Function to start command server in Node mode
start_node_server() {
  print_info "Starting Node.js command server..."
  
  # Check if port 9999 is already used
  if lsof -i :9999 > /dev/null 2>&1; then
    print_error "Port 9999 is already used. Cleaning up existing processes..."
    cleanup_port 9999
    sleep 2
  fi
  
  # Start Node command server
  SERVER_PID=$(start_server "node $PROJECT_ROOT/scripts/server/command_server.js" "/tmp/node-command-server.log")
  
  # Wait for server to be ready
  print_info "Waiting for Node.js server to start..."
  sleep 3
  
  # Check if server is running
  if ! ps -p $SERVER_PID > /dev/null; then
    print_error "Node.js server did not start correctly."
    print_info "Check logs in /tmp/node-command-server.log for more details."
    return 1
  fi
  
  print_success "Node.js server started successfully (PID: $SERVER_PID)."
  return 0
}

# Function to run command tests
run_command_tests() {
  local test_pattern=$1
  local mode_desc="Neovim"
  
  if [ "$MODE" = "node" ]; then
    mode_desc="Node.js"
  fi
  
  print_header "Command Tests - Mode: $mode_desc"
  
  # Build test pattern
  local jest_pattern="command"
  if [ -n "$test_pattern" ]; then
    jest_pattern="${jest_pattern}.*${test_pattern}"
  fi
  
  print_info "Running command tests (pattern: $jest_pattern)..."
  
  # Run tests with Jest
  VERBOSE_LOGS=${VERBOSE_LOGS:-false} npx jest --config ./test/jest.config.js --testPathPattern="$jest_pattern"
  local result=$?
  
  if [ $result -eq 0 ]; then
    print_success "✓ All command tests passed!"
  else
    print_error "✗ Some command tests failed."
    print_info "To see detailed logs, run with VERBOSE_LOGS=true :"
    print_info "VERBOSE_LOGS=true ./scripts/test/runners/run-command-tests.sh"
  fi
  
  return $result
}

# Function to parse arguments
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --node)
        MODE="node"
        shift
        ;;
      --neovim)
        MODE="neovim"
        shift
        ;;
      --test)
        TEST_PATTERN="$2"
        shift 2
        ;;
      *)
        # If argument does not start with --, consider it as a test pattern
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
  
  # Check prerequisites
  check_prerequisites "node" "npx" "jest" "lsof"
  
  # Check specific prerequisites for mode
  if [ "$MODE" = "neovim" ]; then
    check_prerequisites "nvim"
  fi
  
  # Configure trap to clean up on interruption
  trap cleanup EXIT INT TERM
  
  # Start server based on mode
  if [ "$MODE" = "node" ]; then
    if ! start_node_server; then
      return 1
    fi
  else
    if ! start_neovim_server; then
      return 1
    fi
  fi
  
  # Run command tests
  run_command_tests "$TEST_PATTERN"
  
  return $?
}

# Run main function with arguments
parse_args "$@"
main
