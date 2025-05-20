#!/bin/bash
# Script to run ping tests (Neovim or Lua mode)

# Import common utilities
source "$(dirname "$0")/../../utils/output.sh"

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Global variables
SERVER_PID=""
SERVER_MODE="neovim"

# Cleanup function on exit
cleanup() {
  if [ -n "$SERVER_PID" ]; then
    if [ "$SERVER_MODE" = "neovim" ]; then
      pkill -P $SERVER_PID 2>/dev/null
      kill -9 $SERVER_PID 2>/dev/null
    else
      kill -9 $SERVER_PID 2>/dev/null
    fi
  fi
  
  rm -f /tmp/ping-server.log 2>/dev/null
  rm -f /tmp/simple-ping-server.log 2>/dev/null
  
  exit ${1:-$?}
}

# Function to start ping server in Neovim mode
start_neovim_server() {
  # Start Neovim server
  nvim --headless --listen localhost:6666 \
    -c "lua require('test.utils.ping_server').start()" \
    > /tmp/ping-server.log 2>&1 &
  
  SERVER_PID=$!
  SERVER_MODE="neovim"
  
  # Wait for server to start
  sleep 2
  
  if ! ps -p $SERVER_PID > /dev/null; then
    print_error "Failed to start Neovim server."
    print_info "Check logs in /tmp/ping-server.log for details."
    exit 1
  fi
  
  print_success "Neovim server started successfully (PID: $SERVER_PID)."
}

# Function to start ping server in simple Lua mode
start_simple_server() {
  # Start simple Lua server
  lua test/utils/simple_ping_server.lua \
    > /tmp/simple-ping-server.log 2>&1 &
  
  SERVER_PID=$!
  SERVER_MODE="lua"
  
  # Wait for server to start
  sleep 2
  
  if ! ps -p $SERVER_PID > /dev/null; then
    print_error "Failed to start simple Lua server."
    print_info "Check logs in /tmp/simple-ping-server.log for details."
    exit 1
  fi
  
  print_success "Simple Lua server started successfully (PID: $SERVER_PID)."
}

# Function to run ping test
run_ping_test() {
  local mode=$1
  local timeout=${2:-30}
  
  # Run ping test with Node.js
  PING_MODE=$mode PING_TIMEOUT=$timeout \
    node test/utils/ping_test.js
  
  local result=$?
  
  if [ $result -ne 0 ]; then
    print_error "Ping test failed."
    print_info "For detailed logs, run with VERBOSE_LOGS=true:"
    print_info "VERBOSE_LOGS=true ./scripts/test/runners/run-ping-tests.sh"
    return 1
  fi
  
  return 0
}

# Function to parse arguments
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --mode)
        SERVER_MODE="$2"
        shift 2
        ;;
      --timeout)
        TIMEOUT="$2"
        shift 2
        ;;
      *)
        shift
        ;;
    esac
  done
  
  # Validate mode
  if [ "$SERVER_MODE" != "neovim" ] && [ "$SERVER_MODE" != "lua" ]; then
    print_error "Invalid mode: $SERVER_MODE"
    print_info "Valid modes: neovim, lua"
    exit 1
  fi
}

# Main function
main() {
  local timeout=${TIMEOUT:-30}
  
  # Parse command line arguments
  parse_args "$@"
  
  # Configure trap for cleanup on interruption
  trap cleanup SIGINT SIGTERM
  
  # Start server based on mode
  if [ "$SERVER_MODE" = "neovim" ]; then
    start_neovim_server
  else
    start_simple_server
  fi
  
  # Run ping test
  run_ping_test "$SERVER_MODE" "$timeout"
  local result=$?
  
  # Cleanup and exit
  cleanup $result
}

# Execute main function with arguments
main "$@"
