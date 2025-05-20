#!/bin/bash

# Script to verify the real integration of the Select component in a Neovim+COC environment
# This script will start Neovim, restart COC, and check if the vue.selectDemo command is available

echo "=== COC-VUE Select Component Real Integration Test ==="
echo "Date: $(date)"
echo ""

# Create a temporary Vim script for testing
cat > /tmp/real_integration_test.vim << 'EOF'
" Wait for COC to be ready
function! WaitForCoc()
  let l:timeout = 30
  let l:counter = 0
  while l:counter < l:timeout
    if exists('g:coc_service_initialized') && g:coc_service_initialized
      return 1
    endif
    sleep 500m
    let l:counter += 1
    echo "Waiting for COC to be ready... " . l:counter
  endwhile
  return 0
endfunction

" Main test function
function! TestRealIntegration()
  echo "=== COC-VUE Select Component Real Integration Test ==="
  echo "Date: " . strftime("%Y-%m-%d %H:%M:%S")
  echo ""
  
  echo "Waiting for COC to be ready..."
  if !WaitForCoc()
    echo "ERROR: COC did not become ready within the timeout period"
    return
  endif
  
  echo "COC is ready. Restarting COC..."
  CocRestart
  
  " Wait for COC to restart
  sleep 3
  
  echo "Checking COC extensions..."
  CocList extensions
  
  echo "Checking runtime path..."
  echo &runtimepath
  
  echo "Checking loaded scripts..."
  echo execute('scriptnames')
  
  echo "Checking available COC commands..."
  echo execute('CocList commands')
  
  echo "Checking for vue.selectDemo command..."
  let l:commands_output = execute('CocList commands')
  if l:commands_output =~ 'vue.selectDemo'
    echo "SUCCESS: vue.selectDemo command is registered"
  else
    echo "ERROR: vue.selectDemo command is NOT registered"
    echo "Available commands:"
    echo l:commands_output
    return
  endif
  
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
call TestRealIntegration()
EOF

# Run Neovim with the test script
echo "Starting Neovim with COC integration test..."
nvim -c "source /tmp/real_integration_test.vim"

echo ""
echo "Test completed"
