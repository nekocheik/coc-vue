#!/bin/bash
# Script to clean up ports used by tests

source "$(dirname "$0")/../../utils/output.sh"

# Main cleanup function
cleanup_ports() {
  local start_port=${1:-3000}
  local end_port=${2:-3999}
  local force=${3:-false}

  # Clean up ports in range
  print_info "Cleaning up ports in range $start_port-$end_port..."

  if command -v lsof >/dev/null 2>&1; then
    print_info "Using port manager for cleanup..."
    
    for port in $(seq $start_port $end_port); do
      local pid=$(lsof -t -i:$port 2>/dev/null)
      if [ -n "$pid" ]; then
        if [ "$force" = true ]; then
          kill -9 $pid 2>/dev/null
        else
          kill $pid 2>/dev/null
        fi
      fi
    done
  fi
}

# Clean up Neovim processes
cleanup_neovim() {
  local force=${1:-false}
  
  if [ "$force" = true ]; then
    pkill -9 nvim 2>/dev/null
  else
    pkill nvim 2>/dev/null
  fi
  
  print_success "Neovim processes cleaned up successfully."
}

# Clean up Node processes by name
cleanup_node_process() {
  local process=$1
  local force=${2:-false}
  
  if [ -z "$process" ]; then
    return 1
  fi
  
  print_info "Cleaning up Node processes for $process..."
  
  if [ "$force" = true ]; then
    pkill -9 -f "$process" 2>/dev/null
  else
    pkill -f "$process" 2>/dev/null
  fi
  
  print_success "Process $process cleaned up successfully."
}

# Main function
main() {
  local force=false
  
  while [[ $# -gt 0 ]]; do
    case $1 in
      --force) force=true; shift ;;
      *) shift ;;
    esac
  done
  
  cleanup_ports 3000 3999 $force
  cleanup_neovim $force
  cleanup_node_process "jest" $force
  cleanup_node_process "ts-node" $force
}

# Execute main function
main "$@"
