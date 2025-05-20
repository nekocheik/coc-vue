" component_server_init.vim - Init file for component server test
set nocompatible
set hidden
filetype plugin indent on
syntax enable

" Add the project root to the runtime path
let s:project_root = expand('<sfile>:p:h:h:h')
let &runtimepath.=','.s:project_root

" Add the lua directory to package.path
lua << EOF
package.path = package.path .. ';' .. vim.fn.expand('<sfile>:p:h:h:h') .. '/lua/?.lua'
package.path = package.path .. ';' .. vim.fn.expand('<sfile>:p:h:h:h') .. '/lua/?/init.lua'
EOF

" Load the component server
lua << EOF
-- Print debug info
print("Lua version: " .. _VERSION)
print("Project root: " .. vim.fn.expand("<sfile>:p:h:h"))

-- Load and start the component server
local server = require('vue-ui.test.component_server')
server.start()

-- Register a global function to stop the server on exit
function _G.stop_server()
  server.stop()
end

print("Component server started successfully")

-- Register a function to stop the server on exit
vim.cmd([[
  augroup ComponentServer
    autocmd!
    autocmd VimLeave * lua stop_server()
  augroup END
]])
EOF

" Keep Neovim running
autocmd VimEnter * echom "Component server initialized and running."
