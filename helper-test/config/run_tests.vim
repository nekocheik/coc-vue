set rtp+=~/.local/share/nvim/site/pack/plugins/start/vader.vim
runtime! plugin/vader.vim

" Configure Lua path to find our modules
lua << EOF
-- Add project path to Lua search path
local project_path = '/Users/cheikkone/Desktop/Projects/coc-cheik-2/coc-vue'
package.path = project_path .. '/lua/?.lua;' .. project_path .. '/lua/?/init.lua;' .. package.path

-- Ensure vue-ui module is properly loaded
package.loaded['vue-ui'] = nil  -- Force module reload

-- Debug: display Lua search path
print("Lua search path: " .. package.path)
EOF

" Preload vue-ui module
lua require('vue-ui')

" Run Modal tests
Vader test/vader/modal.vader
