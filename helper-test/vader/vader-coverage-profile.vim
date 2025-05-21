" Vim profile for running Vader tests with coverage collection
" This profile sets up the environment for running tests and collecting coverage data

" Basic Vim settings
set nocompatible
filetype plugin on
syntax enable

" Load Vader plugin
packadd vader.vim

" Set up coverage collection
let g:vader_coverage_enabled = 1
let g:vader_coverage_file = '.ci-artifacts/coverage-reports/coverage.json'

" Function to initialize coverage tracking
function! InitCoverage()
  " Initialize coverage data structure
  let g:vader_coverage_data = {
        \ 'files': {},
        \ 'functions': {},
        \ 'lines': {},
        \ 'branches': {}
        \ }
endfunction

" Function to record line execution
function! RecordLineExecution(file, line)
  if !has_key(g:vader_coverage_data.files, a:file)
    let g:vader_coverage_data.files[a:file] = {'lines': {}}
  endif
  
  if !has_key(g:vader_coverage_data.files[a:file].lines, a:line)
    let g:vader_coverage_data.files[a:file].lines[a:line] = 0
  endif
  
  let g:vader_coverage_data.files[a:file].lines[a:line] += 1
endfunction

" Function to record function execution
function! RecordFunctionExecution(file, func)
  if !has_key(g:vader_coverage_data.functions, a:file)
    let g:vader_coverage_data.functions[a:file] = {}
  endif
  
  if !has_key(g:vader_coverage_data.functions[a:file], a:func)
    let g:vader_coverage_data.functions[a:file][a:func] = 0
  endif
  
  let g:vader_coverage_data.functions[a:file][a:func] += 1
endfunction

" Function to save coverage data to file
function! SaveCoverage()
  " Convert to JSON and save
  let l:json = json_encode(g:vader_coverage_data)
  call writefile([l:json], g:vader_coverage_file)
endfunction

" Hook into Vader execution
augroup VaderCoverage
  autocmd!
  autocmd User VaderStart call InitCoverage()
  autocmd User VaderEnd call SaveCoverage()
augroup END

" Set up Lua instrumentation for coverage
lua << EOF
-- Store original require function
local original_require = require

-- Override require to instrument loaded modules
_G.require = function(module_name)
  local module = original_require(module_name)
  
  -- Only instrument vue-ui modules
  if module_name:match('^vue%-ui') then
    -- Wrap functions to record execution
    for key, value in pairs(module) do
      if type(value) == 'function' then
        module[key] = function(...)
          -- Record function execution
          vim.fn.RecordFunctionExecution(module_name, key)
          -- Call original function
          return value(...)
        end
      end
    end
    
    -- Set metatable to handle method calls on objects
    if type(module) == 'table' then
      local mt = getmetatable(module) or {}
      local original_index = mt.__index
      
      mt.__index = function(t, k)
        local v = original_index and original_index(t, k) or rawget(t, k)
        if type(v) == 'function' then
          return function(...)
            -- Record function execution
            vim.fn.RecordFunctionExecution(module_name, k)
            -- Call original function
            return v(...)
          end
        end
        return v
      end
      
      setmetatable(module, mt)
    end
  end
  
  return module
end
EOF

" Load the vue-ui plugin
lua require('vue-ui')
