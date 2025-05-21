" Script to run VADER tests with coverage collection
" This is used by the run-refactored-vader-tests.sh script

" Basic setup
set nocompatible
filetype plugin on
syntax on

" Set up coverage data structure
let g:coverage_data = {}
let g:coverage_file = get(g:, 'coverage_file', '.ci-artifacts/coverage-reports/coverage.json')

" Function to initialize coverage tracking
function! InitCoverage()
  let g:coverage_data = {
        \ 'files': {},
        \ 'functions': {},
        \ 'timestamp': strftime('%Y-%m-%d %H:%M:%S')
        \ }
endfunction

" Function to record function execution
function! RecordFunction(module, func)
  if !has_key(g:coverage_data.functions, a:module)
    let g:coverage_data.functions[a:module] = {}
  endif
  
  if !has_key(g:coverage_data.functions[a:module], a:func)
    let g:coverage_data.functions[a:module][a:func] = 0
  endif
  
  let g:coverage_data.functions[a:module][a:func] += 1
endfunction

" Function to record file access
function! RecordFile(file)
  if !has_key(g:coverage_data.files, a:file)
    let g:coverage_data.files[a:file] = 1
  else
    let g:coverage_data.files[a:file] += 1
  endif
endfunction

" Function to save coverage data
function! SaveCoverage()
  let l:json = json_encode(g:coverage_data)
  call writefile([l:json], g:coverage_file)
endfunction

" Initialize coverage
call InitCoverage()

" Set up Lua instrumentation
lua << EOF
-- Store original require function
local original_require = require

-- Create a table to track loaded modules
_G._coverage_loaded_modules = {}

-- Override require to instrument loaded modules
_G.require = function(module_name)
  -- Record file access for coverage
  vim.fn.RecordFile(module_name)
  
  -- Check if we've already loaded and instrumented this module
  if _G._coverage_loaded_modules[module_name] then
    return _G._coverage_loaded_modules[module_name]
  end
  
  -- Load the module
  local module = original_require(module_name)
  
  -- Only instrument vue-ui modules
  if module_name:match('^vue%-ui') then
    -- Create a proxy table to wrap the module
    local proxy = {}
    
    -- For each function in the module, create a wrapper that records execution
    for key, value in pairs(module) do
      if type(value) == 'function' then
        proxy[key] = function(...)
          -- Record function execution
          vim.fn.RecordFunction(module_name, key)
          -- Call original function
          return value(...)
        end
      else
        -- For non-functions, just copy the value
        proxy[key] = value
      end
    end
    
    -- Store the instrumented module
    _G._coverage_loaded_modules[module_name] = proxy
    return proxy
  end
  
  -- For non-vue-ui modules, return as is
  _G._coverage_loaded_modules[module_name] = module
  return module
end
EOF

" Load Vader plugin
packadd vader.vim

" Hook into Vader execution to save coverage at the end
augroup VaderCoverage
  autocmd!
  autocmd User VaderEnd call SaveCoverage()
augroup END
