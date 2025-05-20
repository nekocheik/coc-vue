#!/bin/bash
# test-utils.sh
# Common utility functions for test scripts

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to display header message
print_header() {
  echo -e "${BLUE}$1${NC}"
}

# Function to display information message
print_info() {
  echo -e "${YELLOW}$1${NC}"
}

# Function to display success message
print_success() {
  echo -e "${GREEN}$1${NC}"
}

# Function to display error message
print_error() {
  echo -e "${RED}$1${NC}"
}

# Function to display debug message (only if VERBOSE=true)
print_debug() {
  if [ "$VERBOSE" = "true" ]; then
    echo -e "$1"
  fi
}

# Function to clean up processes on a specific port
cleanup_port() {
  local port=$1
  print_info "Cleaning up processes on port $port..."
  
  if command -v lsof >/dev/null 2>&1; then
    local pids=$(lsof -t -i:$port 2>/dev/null)
    if [ -n "$pids" ]; then
      echo "$pids" | xargs kill -9 2>/dev/null
      print_success "Processes on port $port terminated."
    else
      print_info "No processes using port $port."
    fi
  fi
}

# Function to clean up all ports in a range
cleanup_port_range() {
  local start_port=$1
  local end_port=$2
  
  print_info "Cleaning up ports in range $start_port-$end_port..."
  
  local found=false
  for port in $(seq $start_port $end_port); do
    if command -v lsof >/dev/null 2>&1; then
      local pids=$(lsof -t -i:$port 2>/dev/null)
      if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null
        found=true
      fi
    fi
  done
  
  if [ "$found" = true ]; then
    print_success "All processes in port range terminated."
  else
    print_info "No processes using ports in range $start_port-$end_port."
  fi
}

# Function to wait for a port to be available
wait_for_port() {
  local port=$1
  local timeout=${2:-30}
  local start_time=$(date +%s)
  
  print_info "Waiting for port $port to be available (timeout: ${timeout}s)..."
  
  while true; do
    if ! lsof -i :$port >/dev/null 2>&1; then
      print_success "Port $port is now available."
      return 0
    fi
    
    if [ $(($(date +%s) - start_time)) -ge $timeout ]; then
      print_error "Timeout waiting for port $port to be available."
      return 1
    fi
    
    sleep 1
  done
}

# Function to wait for a file to exist
wait_for_file() {
  local file_path=$1
  local timeout=${2:-30}
  local start_time=$(date +%s)
  
  print_info "Waiting for file $file_path to exist (timeout: ${timeout}s)..."
  
  while true; do
    if [ -f "$file_path" ]; then
      print_success "File $file_path exists."
      return 0
    fi
    
    if [ $(($(date +%s) - start_time)) -ge $timeout ]; then
      print_error "Timeout waiting for file $file_path to exist."
      return 1
    fi
    
    sleep 1
  done
}

# Function to start a background server and capture its PID
start_background_server() {
  local command=$1
  local log_file=${2:-/dev/null}
  
  print_info "Starting server in background..."
  
  eval "$command" > "$log_file" 2>&1 &
  local server_pid=$!
  
  echo $server_pid
}

# Function to gracefully kill a process
kill_process() {
  local pid=$1
  local timeout=${2:-5}
  local force=${3:-false}
  
  # Check if process exists
  if ! kill -0 $pid 2>/dev/null; then
    print_info "Process $pid does not exist or has already been terminated."
    return 0
  fi
  
  print_info "Stopping process $pid..."
  
  # Try graceful shutdown first
  kill $pid 2>/dev/null
  
  # Wait for process to terminate
  local start_time=$(date +%s)
  while kill -0 $pid 2>/dev/null; do
    if [ $(($(date +%s) - start_time)) -ge $timeout ]; then
      # If process still exists, use SIGKILL
      if [ "$force" = true ]; then
        print_info "Process $pid not responding, forcing termination..."
        kill -9 $pid 2>/dev/null
        sleep 1
      fi
      break
    fi
    sleep 1
  done
  
  # Verify process termination
  if ! kill -0 $pid 2>/dev/null; then
    print_success "Process $pid terminated successfully."
    return 0
  else
    print_error "Unable to terminate process $pid."
    return 1
  fi
}

# Function to run command with timeout
run_with_timeout() {
  local command=$1
  local timeout=${2:-30}
  local description=${3:-"command"}
  
  # Monitor process with timeout
  local start_time=$(date +%s)
  
  # Run command in background
  eval "$command" &
  local command_pid=$!
  
  # Wait for command to finish or timeout
  while kill -0 $command_pid 2>/dev/null; do
    if [ $(($(date +%s) - start_time)) -ge $timeout ]; then
      kill -9 $command_pid 2>/dev/null
      print_error "Timeout reached for $description"
      return 1
    fi
    sleep 1
  done
  
  wait $command_pid
  return $?
}

# Function to check prerequisites
check_prerequisites() {
  local missing=false
  
  # Check for required commands
  for cmd in "$@"; do
    if ! command -v $cmd >/dev/null 2>&1; then
      print_error "Required command not found: $cmd"
      missing=true
    fi
  done
  
  if [ "$missing" = true ]; then
    return 1
  fi
  
  return 0
}

# Export functions and variables
export -f print_header
export -f print_info
export -f print_success
export -f print_error
export -f print_debug
export -f cleanup_port
export -f cleanup_port_range
export -f wait_for_port
export -f wait_for_file
export -f start_background_server
export -f kill_process
export -f run_with_timeout
export -f check_prerequisites
