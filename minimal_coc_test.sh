#!/bin/bash

# Script to verify the COC command integration in a real Neovim session
# This script will:
# 1. Restart COC to ensure a clean state
# 2. Check if vue.selectDemo is registered in CocList commands
# 3. Attempt to execute the command
# 4. Capture any errors or logs

echo "=== COC-VUE Select Component Integration Test ==="
echo "Date: $(date)"
echo ""

# Create a temporary Vim script for testing
cat > /tmp/coc_test.vim << 'EOF'
" Wait for COC to be ready
function! WaitForCoc()
  let l:timeout = 30
  let l:counter = 0
  while l:counter < l:timeout
    if coc#rpc#ready()
      return 1
    endif
    sleep 500m
    let l:counter += 1
  endwhile
  return 0
endfunction

" Check if a command exists in CocList commands
function! CheckCocCommand(command)
  redir => l:output
  silent CocList commands
  redir END
  return l:output =~ a:command
endfunction

" Main test function
function! TestCocCommand()
  echo "Waiting for COC to be ready..."
  if !WaitForCoc()
    echo "ERROR: COC did not become ready within the timeout period"
    return
  endif
  
  echo "COC is ready. Restarting COC..."
  CocRestart
  
  " Wait for COC to restart
  sleep 3
  
  if !WaitForCoc()
    echo "ERROR: COC did not restart properly"
    return
  endif
  
  echo "COC restarted successfully"
  
  " Check if vue.selectDemo is registered
  echo "Checking if vue.selectDemo is registered..."
  if CheckCocCommand('vue.selectDemo')
    echo "SUCCESS: vue.selectDemo is registered in CocList commands"
  else
    echo "ERROR: vue.selectDemo is NOT registered in CocList commands"
    echo "Available commands:"
    CocList commands
    return
  endif
  
  " Try to execute the command
  echo "Attempting to execute vue.selectDemo..."
  try
    CocCommand vue.selectDemo
    echo "Command executed successfully"
  catch
    echo "ERROR executing command: " . v:exception
    echo "COC logs:"
    CocOpenLog
  endtry
endfunction

" Run the test
call TestCocCommand()
EOF

# Run Neovim with the test script
echo "Starting Neovim with COC integration test..."
nvim -u NORC -c "set rtp+=/Users/cheikkone/Desktop/Projects/coc-cheik-2/coc-vue" -c "source /tmp/coc_test.vim"

echo ""
echo "Test completed"
