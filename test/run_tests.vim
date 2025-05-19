set rtp+=~/.local/share/nvim/site/pack/plugins/start/vader.vim
runtime! plugin/vader.vim

" Configurer le chemin Lua pour trouver nos modules
lua << EOF
-- Ajouter le chemin du projet au chemin de recherche Lua
local project_path = '/Users/cheikkone/Desktop/Projects/coc-cheik-2/coc-vue'
package.path = project_path .. '/lua/?.lua;' .. project_path .. '/lua/?/init.lua;' .. package.path

-- S'assurer que le module vue-ui est correctement chargé
package.loaded['vue-ui'] = nil  -- Forcer le rechargement du module

-- Debug: afficher le chemin de recherche Lua
print("Lua search path: " .. package.path)
EOF

" Précharger le module vue-ui
lua require('vue-ui')

" Exécuter les tests Modal
Vader test/vader/modal.vader
