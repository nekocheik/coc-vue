" Test script for validating the TypeScript to Lua integration
" This script will:
" 1. Test the VueUISelect command directly
" 2. Test the CocCommand vue.selectDemo
" 3. Verify keyboard interactions
" 4. Check for errors in the Coc log

" Function to log test results
function! LogTestResult(test_name, result, details)
  call writefile([a:test_name . ': ' . a:result . ' - ' . a:details], 'integration_test_results.log', 'a')
  echo a:test_name . ': ' . a:result . ' - ' . a:details
endfunction

" Function to check if a buffer with a specific name exists
function! BufferExists(name)
  return bufnr(a:name) != -1
endfunction

" Test 1: Check if VueUISelect command is registered
function! TestVueUISelectCommand()
  let l:cmd_output = execute('command VueUISelect')
  if l:cmd_output =~ 'VueUISelect'
    call LogTestResult('VueUISelect command registration', 'SUCCESS', 'Command is registered')
    return 1
  else
    call LogTestResult('VueUISelect command registration', 'FAILURE', 'Command is not registered')
    return 0
  endif
endfunction

" Test 2: Run VueUISelect command directly
function! TestDirectVueUISelect()
  try
    execute 'VueUISelect test_direct "Direct Test" {"multi":false,"options":[{"id":"option1","text":"Option 1","value":"value1"},{"id":"option2","text":"Option 2","value":"value2"},{"id":"option3","text":"Option 3","value":"value3"}]}'
    
    " Check if a buffer was created for the Select component
    if BufferExists('Select Component')
      call LogTestResult('Direct VueUISelect execution', 'SUCCESS', 'Select component opened')
      return 1
    else
      call LogTestResult('Direct VueUISelect execution', 'FAILURE', 'Select component buffer not found')
      return 0
    endif
  catch
    call LogTestResult('Direct VueUISelect execution', 'ERROR', v:exception)
    return 0
  endtry
endfunction

" Test 3: Run CocCommand vue.selectDemo
function! TestCocCommandSelectDemo()
  try
    execute 'CocCommand vue.selectDemo'
    
    " Check if a buffer was created for the Select component
    if BufferExists('Select Component') || BufferExists('Select Demo')
      call LogTestResult('CocCommand vue.selectDemo', 'SUCCESS', 'Select component opened via CocCommand')
      return 1
    else
      call LogTestResult('CocCommand vue.selectDemo', 'FAILURE', 'Select component buffer not found')
      return 0
    endif
  catch
    call LogTestResult('CocCommand vue.selectDemo', 'ERROR', v:exception)
    return 0
  endtry
endfunction

" Test 4: Check Coc logs for errors
function! TestCocLogs()
  try
    let l:log_output = execute('CocCommand workspace.showOutput')
    if l:log_output =~ 'Error' || l:log_output =~ 'Exception'
      call LogTestResult('Coc logs', 'WARNING', 'Errors found in Coc logs')
      return 0
    else
      call LogTestResult('Coc logs', 'SUCCESS', 'No errors found in Coc logs')
      return 1
    endif
  catch
    call LogTestResult('Coc logs', 'ERROR', v:exception)
    return 0
  endtry
endfunction

" Run all tests
function! RunAllTests()
  " Clear previous test results
  call writefile(['=== Integration Test Results ==='], 'integration_test_results.log')
  
  " Run tests
  let l:cmd_test = TestVueUISelectCommand()
  let l:direct_test = TestDirectVueUISelect()
  let l:coc_test = TestCocCommandSelectDemo()
  let l:log_test = TestCocLogs()
  
  " Summary
  let l:success_count = l:cmd_test + l:direct_test + l:coc_test + l:log_test
  let l:total_tests = 4
  
  call writefile(['', '=== Test Summary ===', 'Passed: ' . l:success_count . '/' . l:total_tests], 'integration_test_results.log', 'a')
  echo 'Test Summary: ' . l:success_count . '/' . l:total_tests . ' tests passed'
endfunction

" Run the tests
call RunAllTests()
