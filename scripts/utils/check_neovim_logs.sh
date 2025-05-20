#!/bin/bash
# Script to check Neovim and Coc.nvim logs between test steps

# Colors for display
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STEP_NAME="$1"
COC_LOG_FILE="$HOME/.config/coc/coc.log"
NEOVIM_LOG_FILE="$HOME/.local/share/nvim/log"

# Function to extract error messages from Neovim
check_neovim_messages() {
  echo -e "${BLUE}Checking Neovim messages for step: ${YELLOW}${STEP_NAME}${NC}"
  
  # Execute :messages command in Neovim and capture output
  local messages=$(nvim --headless -c 'redir => g:msg | silent messages | redir END | echo g:msg | quit')
  
  # Check if errors are present in messages
  if echo "$messages" | grep -i "error\|exception\|failed" > /dev/null; then
    echo -e "${RED}✗ Errors detected in Neovim messages:${NC}"
    echo "$messages" | grep -i "error\|exception\|failed" | sed 's/^/  /'
    return 1
  else
    echo -e "${GREEN}✓ No errors detected in Neovim messages${NC}"
    return 0
  fi
}

# Function to check Coc.nvim logs
check_coc_logs() {
  echo -e "${BLUE}Checking Coc.nvim logs for step: ${YELLOW}${STEP_NAME}${NC}"
  
  # Check if log file exists
  if [ ! -f "$COC_LOG_FILE" ]; then
    echo -e "${YELLOW}! Coc.nvim log file not found: $COC_LOG_FILE${NC}"
    return 0
  fi
  
  # Check last 50 lines of log for recent errors
  local recent_errors=$(tail -n 50 "$COC_LOG_FILE" | grep -i "error\|exception\|failed")
  
  if [ -n "$recent_errors" ]; then
    echo -e "${RED}✗ Errors detected in recent Coc.nvim logs:${NC}"
    echo "$recent_errors" | sed 's/^/  /'
    return 1
  else
    echo -e "${GREEN}✓ No errors detected in recent Coc.nvim logs${NC}"
    return 0
  fi
}

# Main execution
check_neovim_messages
neovim_status=$?

check_coc_logs
coc_status=$?

# Return overall status
[ $neovim_status -eq 0 ] && [ $coc_status -eq 0 ]
