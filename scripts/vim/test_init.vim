" test_init.vim - Minimal init file for testing the Neovim server
set nocompatible
set hidden
filetype plugin indent on
syntax enable

" Add the project root to the runtime path
let s:project_root = expand('<sfile>:p:h:h')
let &runtimepath.=','.s:project_root

" Load the test server
lua << EOF
  package.path = package.path .. ";" .. vim.fn.expand("<sfile>:p:h:h") .. "/lua/?.lua"
  local server = require('vue-ui.test.server')
  server.start()
  
  -- Print debug info
  print("Lua version: " .. _VERSION)
  print("Project root: " .. vim.fn.expand("<sfile>:p:h:h"))
  print("Package path: " .. package.path)
EOF

" Keep Neovim running
autocmd VimEnter * echom "Test server initialized and running. Press Ctrl+C to exit."
