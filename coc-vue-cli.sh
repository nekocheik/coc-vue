#!/bin/bash
# coc-vue-cli.sh
# CLI for the coc-vue extension

# Set the path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to display header
print_header() {
  echo -e "\n${BLUE}=========================================${NC}"
  echo -e "${BLUE}   CoC Vue CLI - Development Tool   ${NC}"
  echo -e "${BLUE}=========================================${NC}\n"
}

# Function to display help
show_help() {
  echo -e "${CYAN}Usage:${NC} ./coc-vue-cli.sh [command] [options]"
  echo ""
  echo -e "${CYAN}Available commands:${NC}"
  echo -e "  ${GREEN}test${NC}                                Run integration tests"
  echo -e "  ${GREEN}test:component${NC}                      Run component tests"
  echo -e "  ${GREEN}test:component [section]${NC}            Run a specific section of component tests"
  echo -e "  ${GREEN}test:command${NC}                        Run command tests"
  echo -e "  ${GREEN}test:ping${NC}                           Run ping tests"
  echo -e "  ${GREEN}server:start${NC}                        Start the component server"
  echo -e "  ${GREEN}server:stop${NC}                         Stop the component server"
  echo -e "  ${GREEN}logs:check [step]${NC}                   Check logs for a specific step"
  echo -e "  ${GREEN}logs:analyze${NC}                        Analyze test results"
  echo -e "  ${GREEN}ticket:create [category] [priority] [title]${NC}  Create a new ticket"
  echo -e "  ${GREEN}ticket:list${NC}                         List all tickets"
  echo -e "  ${GREEN}ticket:status [uuid] [status]${NC}       Change ticket status"
  echo -e "  ${GREEN}ticket:deploy [uuid]${NC}                Deploy a ticket to GitHub Issues"
  echo -e "  ${GREEN}help${NC}                                Display this help"
  echo ""
  echo -e "${CYAN}Categories:${NC} feat, ui, structure, ci, docs, test, perf"
  echo ""
  echo -e "${CYAN}Examples:${NC}"
  echo -e "  ./coc-vue-cli.sh test:component"
  echo -e "  ./coc-vue-cli.sh test:component component-loading"
  echo -e "  ./coc-vue-cli.sh server:start"
  echo -e "  ./coc-vue-cli.sh logs:check server_startup"
  echo -e "  ./coc-vue-cli.sh ticket:create feat 90 'Fix Vader Test Integration'"
  echo -e "  ./coc-vue-cli.sh ticket:status a88cf6d1 in-progress"
  echo -e "  ./coc-vue-cli.sh ticket:deploy a88cf6d1"
  echo ""
}

# Function to run component tests
run_component_tests() {
  local section=$1
  echo -e "${YELLOW}Running component tests...${NC}"
  
  if [ -n "$section" ]; then
    echo -e "${YELLOW}Section: ${section}${NC}"
    "$PROJECT_ROOT/scripts/test/runners/run-component-tests.sh" "$section"
  else
    "$PROJECT_ROOT/scripts/test/runners/run-component-tests.sh"
  fi
}

# Function to run command tests
run_command_tests() {
  echo -e "${YELLOW}Running command tests...${NC}"
  "$PROJECT_ROOT/scripts/test/runners/run-command-tests.sh"
}

# Function to run ping tests
run_ping_tests() {
  echo -e "${YELLOW}Running ping tests...${NC}"
  "$PROJECT_ROOT/scripts/test/runners/run-ping-tests.sh"
}

# Function to start the component server
start_component_server() {
  echo -e "${YELLOW}Starting component server...${NC}"
  "$PROJECT_ROOT/scripts/server/run_component_server.sh" &
  echo -e "${GREEN}Server started in background. PID: $!${NC}"
  echo -e "${YELLOW}Use 'server:stop' to stop the server.${NC}"
}

# Function to stop the component server
stop_component_server() {
  echo -e "${YELLOW}Stopping component server...${NC}"
  local server_pid=$(lsof -i :9999 -t)
  
  if [ -n "$server_pid" ]; then
    echo -e "${YELLOW}Stopping process with PID: ${server_pid}${NC}"
    kill -9 $server_pid
    echo -e "${GREEN}Server stopped.${NC}"
  else
    echo -e "${RED}No server running on port 9999.${NC}"
  fi
}

# Function to check logs
check_logs() {
  local step=$1
  
  if [ -z "$step" ]; then
    echo -e "${RED}Error: You must specify a step to check logs.${NC}"
    echo -e "${YELLOW}Example: ./coc-vue-cli.sh logs:check server_startup${NC}"
    return 1
  fi
  
  echo -e "${YELLOW}Checking logs for step: ${step}${NC}"
  "$PROJECT_ROOT/scripts/utils/check_neovim_logs.sh" "$step"
}

# Function to analyze test results
analyze_test_results() {
  echo -e "${YELLOW}Analyzing test results...${NC}"
  "$PROJECT_ROOT/scripts/utils/check_test_results.sh"
}

# Function to handle ticket management commands
handle_ticket_commands() {
  local subcommand=$1
  shift
  
  "$PROJECT_ROOT/scripts/ticket_management.sh" "$subcommand" "$@"
}

# Main function
main() {
  print_header
  
  local command=$1
  shift
  
  case $command in
    "test")
      run_component_tests
      ;;
    "test:component")
      run_component_tests "$1"
      ;;
    "test:command")
      run_command_tests
      ;;
    "test:ping")
      run_ping_tests
      ;;
    "server:start")
      start_component_server
      ;;
    "server:stop")
      stop_component_server
      ;;
    "logs:check")
      check_logs "$1"
      ;;
    "logs:analyze")
      analyze_test_results
      ;;
    "ticket:create" | "ticket:list" | "ticket:deploy" | "ticket:generate-all")
      local subcommand=${command#ticket:}
      handle_ticket_commands "$subcommand" "$@"
      ;;
    "help" | "")
      show_help
      ;;
    *)
      echo -e "${RED}Unknown command: ${command}${NC}"
      show_help
      return 1
      ;;
  esac
}

# Exécuter la fonction principale avec les arguments
main "$@"
