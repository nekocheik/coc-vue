-- Script pour exécuter les tests Vader avec le bon environnement Lua
local function setup_lua_path()
  -- Ajouter le répertoire courant au chemin de recherche Lua
  package.path = package.path .. ";./lua/?.lua;./lua/?/init.lua"
  
  -- Vérifier que les modules sont bien accessibles
  local validation = require('vue-ui.utils.validation')
  local event_bridge = require('vue-ui.utils.event_bridge')
  local test_helpers = require('vue-ui.utils.test_helpers')
  local schema = require('vue-ui.events.schema')
  
  print("Modules chargés avec succès !")
end

-- Configurer l'environnement
setup_lua_path()

-- Exécuter les tests
vim.cmd("Vader! test/vader/select.vader")
