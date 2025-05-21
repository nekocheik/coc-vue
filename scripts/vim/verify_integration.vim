" Integration verification script for the Select component
" This script verifies that the Select component is correctly integrated
" in a real Neovim+COC environment (non headless)

" Function to log results
function! LogResult(test, result, details)
  echohl Title | echo "TEST: " . a:test | echohl None
  if a:result ==# "SUCCESS"
    echohl String | echo "RESULT: " . a:result | echohl None
  else
    echohl ErrorMsg | echo "RESULT: " . a:result | echohl None
  endif
  echo "DETAILS: " . a:details
  echo ""
endfunction

" Check if VueUISelect command is registered
function! TestCommandRegistration()
  let l:cmd_output = execute('command VueUISelect')
  if l:cmd_output =~# 'VueUISelect'
    call LogResult("Command registration", "SUCCESS", "VueUISelect command is correctly registered")
    return 1
  else
    call LogResult("Command registration", "FAILURE", "VueUISelect command is not registered")
    return 0
  endif
endfunction

" Check runtime path
function! TestRuntimePath()
  let l:rtp = &runtimepath
  let l:extension_path = expand('%:p:h')
  
  if l:rtp =~# l:extension_path
    call LogResult("Runtime path", "SUCCESS", "Extension is in runtime path")
    return 1
  else
    call LogResult("Runtime path", "FAILURE", "Extension is not in runtime path")
    return 0
  endif
endfunction

" Check loaded scripts
function! TestLoadedScripts()
  let l:scripts = execute('scriptnames')
  
  if l:scripts =~# 'vue-ui/init.lua'
    call LogResult("Loaded scripts", "SUCCESS", "vue-ui/init.lua module is loaded")
    return 1
  else
    call LogResult("Loaded scripts", "FAILURE", "vue-ui/init.lua module is not loaded")
    return 0
  endif
endfunction

" Execute VueUISelect command
function! TestVueUISelectExecution()
  try
    execute 'VueUISelect test_direct "Test Direct" {"multi":false,"options":[{"id":"option1","text":"Option 1","value":"value1"},{"id":"option2","text":"Option 2","value":"value2"},{"id":"option3","text":"Option 3","value":"value3"}]}'
    call LogResult("VueUISelect execution", "SUCCESS", "VueUISelect command executed successfully")
    return 1
  catch
    call LogResult("VueUISelect execution", "FAILURE", "Error executing VueUISelect: " . v:exception)
    return 0
  endtry
endfunction

" Execute CocCommand vue.selectDemo
function! TestCocCommandExecution()
  try
    execute 'CocCommand vue.selectDemo'
    call LogResult("CocCommand execution", "SUCCESS", "CocCommand vue.selectDemo executed successfully")
    return 1
  catch
    call LogResult("CocCommand execution", "FAILURE", "Error executing CocCommand vue.selectDemo: " . v:exception)
    return 0
  endtry
endfunction

" Display diagnostic information
function! ShowDiagnosticInfo()
  echohl Title | echo "=== DIAGNOSTIC INFORMATION ===" | echohl None
  echo "Runtime Path: " . &runtimepath
  echo ""
  echo "Loaded scripts:"
  echo execute('scriptnames')
  echo ""
  echo "Available commands:"
  echo execute('command')
  echo ""
  echo "COC logs:"
  try
    echo execute('CocCommand workspace.showOutput')
  catch
    echo "Unable to display COC logs: " . v:exception
  endtry
endfunction

" Run all tests
function! RunAllTests()
  echo "=== SELECT COMPONENT INTEGRATION VERIFICATION ==="
  echo "Date: " . strftime("%Y-%m-%d %H:%M:%S")
  echo ""
  
  let l:cmd_test = TestCommandRegistration()
  let l:rtp_test = TestRuntimePath()
  let l:scripts_test = TestLoadedScripts()
  
  " If basic tests fail, display diagnostic information
  if !l:cmd_test || !l:rtp_test || !l:scripts_test
    call ShowDiagnosticInfo()
    echo "Some basic tests failed. Fixing issues..."
    
    " Fix attempt: explicitly load the module
    echo "Attempting to explicitly load vue-ui module..."
    try
      execute 'lua require("vue-ui.init")'
      echo "Module loaded successfully"
      
      " Check command registration again
      let l:cmd_test = TestCommandRegistration()
    catch
      echo "Error loading module: " . v:exception
    endtry
  endif
  
  " Run execution tests if basic tests pass
  if l:cmd_test
    let l:direct_test = TestVueUISelectExecution()
    let l:coc_test = TestCocCommandExecution()
    
    " Test summary
    let l:success_count = l:cmd_test + l:rtp_test + l:scripts_test + l:direct_test + l:coc_test
    let l:total_tests = 5
    
    echohl Title
    echo "=== TEST SUMMARY ==="
    echohl None
    echo "Tests passed: " . l:success_count . "/" . l:total_tests
    
    if l:success_count == l:total_tests
      echohl String | echo "INTEGRATION SUCCESSFUL: Select component is correctly integrated!" | echohl None
    else
      echohl WarningMsg | echo "PARTIAL INTEGRATION: Some tests failed." | echohl None
      call ShowDiagnosticInfo()
    endif
  else
    echohl ErrorMsg
    echo "INTEGRATION FAILED: Basic tests failed."
    echo "Please verify that the extension is properly installed and the runtime path is configured."
    echohl None
    call ShowDiagnosticInfo()
  endif
endfunction

" Run tests
call RunAllTests()
