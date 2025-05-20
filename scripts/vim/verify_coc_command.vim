" Script to verify the COC command integration
" This script checks if :CocCommand vue.selectDemo is properly registered and working

" Function to log the results
function! LogResult(message)
  echohl Title | echo a:message | echohl None
endfunction

" Function to check if a command exists in the CocCommand list
function! CheckCocCommand(command)
  " Get the list of available CocCommands
  let commands_output = execute('CocList commands')
  return commands_output =~# a:command
endfunction

" Main verification function
function! VerifyCocCommand()
  " Step 1: Check if COC is available
  if !exists('*coc#rpc#start_server')
    LogResult('ERROR: COC is not installed or not running')
    return 0
  endif
  
  LogResult('COC is available')
  
  " Step 2: Check if vue.selectDemo is in the CocCommand list
  if CheckCocCommand('vue.selectDemo')
    LogResult('SUCCESS: vue.selectDemo command is registered in COC')
  else
    LogResult('ERROR: vue.selectDemo command is NOT registered in COC')
    
    " Show all available commands for debugging
    LogResult('Available COC commands:')
    echo execute('CocList commands')
    
    " Check if the extension is loaded
    LogResult('Checking if coc-vue extension is loaded:')
    echo execute('CocList extensions')
    
    return 0
  endif
  
  " Step 3: Try to execute the command
  LogResult('Attempting to execute :CocCommand vue.selectDemo...')
  
  try
    execute 'CocCommand vue.selectDemo'
    LogResult('Command executed successfully')
    return 1
  catch
    LogResult('ERROR executing command: ' . v:exception)
    
    " Show COC logs for debugging
    LogResult('COC logs:')
    echo execute('CocOpenLog')
    
    return 0
  endtry
endfunction

" Run the verification
call VerifyCocCommand()
