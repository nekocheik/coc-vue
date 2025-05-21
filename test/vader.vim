" Base configuration for Vader tests
set nocompatible
filetype plugin on
syntax on

" Add project path to runtimepath
let s:project_path = expand('<sfile>:p:h:h')
let &runtimepath.=','.s:project_path

" Configure Lua environment
lua << EOF
-- Add project path to Lua search path
local project_path = vim.fn.expand('<sfile>:p:h:h')
package.path = project_path .. '/lua/?.lua;' .. project_path .. '/lua/?/init.lua;' .. package.path

-- Preload needed modules
package.loaded['vue-ui'] = nil  -- Force module reload
EOF

" Preload required modules
lua require('vue-ui')
