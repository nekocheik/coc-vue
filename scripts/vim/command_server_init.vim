" command_server_init.vim - Init file for command server test
set nocompatible
set hidden
filetype plugin indent on
syntax enable

" Add the project root to the runtime path
let s:project_root = expand('<sfile>:p:h:h')
let &runtimepath.=','.s:project_root

" Load the command server
lua << EOF
-- Print debug info
print("Lua version: " .. _VERSION)
print("Project root: " .. vim.fn.expand("<sfile>:p:h:h"))

-- Load and start the command server
local server = require('vue-ui.test.command_server')
server.start()

-- Register a global function to stop the server on exit
function _G.stop_server()
  server.stop()
end

print("Command server started successfully")

-- Register a function to stop the server on exit
vim.cmd([[
  augroup CommandServer
    autocmd!
    autocmd VimLeave * lua stop_server()
  augroup END
]])
EOF

" Keep Neovim running
autocmd VimEnter * echom "Command server initialized and running."
