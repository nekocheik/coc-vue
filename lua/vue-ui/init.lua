-- init.lua
-- Point d'entrée principal pour la librairie de composants UI natifs Lua/Vim pour CoC-Vue

-- Helper function to safely get Vim options in both Vim and Neovim
local function get_vim_option(option_name, default_value)
  -- Check if we're in Neovim (vim.o is available)
  if vim and vim.o then
    return vim.o[option_name] or default_value
  -- Check if we're in Vim with vim.eval
  elseif vim and vim.eval then
    local success, result = pcall(function() return vim.eval('&' .. option_name) end)
    if success then return result else return default_value end
  -- Fallback for other environments
  else
    return default_value
  end
end

-- Helper function to get data directory path in a cross-compatible way
local function get_data_path()
  -- Check if we're in Neovim with stdpath function
  if vim and vim.fn and vim.fn.stdpath then
    return vim.fn.stdpath('data')
  -- Check if we're in Vim with expand function
  elseif vim and vim.fn and vim.fn.expand then
    return vim.fn.expand('~/.vim')
  -- Fallback for minimal environments
  else
    return '.'
  end
end

-- Vérification et initialisation du chemin d'exécution
local function ensure_runtime_path()
  local current_path = vim.fn and vim.fn.expand('<sfile>:p:h:h:h') or '.'
  local rtp = get_vim_option('runtimepath', '')
  
  if not string.find(rtp, current_path, 1, true) then
    -- Use a safer way to display messages that works in both Vim and Neovim
    if vim and vim.api and vim.api.nvim_echo then
      vim.api.nvim_echo({{
        "[VueUI] Attention: Le chemin d'exécution ne contient pas le répertoire de l'extension. "
        .. "Certaines fonctionnalités pourraient ne pas fonctionner correctement.",
        "WarningMsg"
      }}, false, {})
    else
      print("[VueUI] Attention: Le chemin d'exécution ne contient pas le répertoire de l'extension.")
    end
    return false
  end
  
  return true
end

-- Vérifier le chemin d'exécution au chargement du module
ensure_runtime_path()

local M = {}

-- Charger les dépendances
local event_bridge = require('vue-ui.utils.event_bridge')
local schema = require('vue-ui.events.schema')

-- Configuration par défaut
local default_config = {
  debug = false,
  log_events = true,
  log_path = get_data_path() .. '/vue-ui-events.json',
  highlight_groups = {
    default = { fg = "Normal", bg = "Normal" },
    primary = { fg = "Function", bg = "Normal" },
    success = { fg = "String", bg = "Normal" },
    warning = { fg = "WarningMsg", bg = "Normal" },
    danger = { fg = "ErrorMsg", bg = "Normal" },
    focused = { fg = "Search", bg = "Normal" },
    disabled = { fg = "Comment", bg = "Normal" }
  }
}

-- Définit les groupes de surbrillance
function M.define_highlight_groups(groups)
  for name, colors in pairs(groups) do
    local cmd = "highlight default VueUI" .. name:gsub("^%l", string.upper)
    
    if colors.fg then
      cmd = cmd .. " guifg=" .. colors.fg
    end
    
    if colors.bg then
      cmd = cmd .. " guibg=" .. colors.bg
    end
    
    vim.cmd(cmd)
  end
end

-- Définit les commandes utilisateur
function M.define_commands()
  print('[VUE-UI] Début de l\'enregistrement des commandes utilisateur')
  
  -- Commande pour créer un bouton
  vim.api.nvim_create_user_command('VueUIButton', function(opts)
    local args = opts.args
    if not args or args == "" then
      vim.api.nvim_echo({{"[VueUI] Arguments manquants pour la commande VueUIButton", "ErrorMsg"}}, false, {})
      return
    end
    
    local parts = vim.split(args, ' ')
    local id = parts[1]
    local label = parts[2] or "Button"
    
    -- Parse options from the remaining arguments
    local options_str = table.concat(parts, ' ', 3)
    local options = {}
    
    if options_str and options_str ~= "" then
      local success, parsed_options = pcall(vim.fn.json_decode, options_str)
      if success then
        options = parsed_options
      end
    end
    
    -- Create and render the button
    local button = M.button.create(id, label, options)
    if button then
      button:render()
      vim.api.nvim_echo({{"[VueUI] Button created: " .. id, "Normal"}}, false, {})
    else
      vim.api.nvim_echo({{"[VueUI] Failed to create button", "ErrorMsg"}}, false, {})
    end
  end, { nargs = '+' })
  
  -- Commande pour créer un input
  vim.api.nvim_create_user_command('VueUIInput', function(opts)
    local args = opts.args
    if not args or args == "" then
      vim.api.nvim_echo({{"[VueUI] Arguments manquants pour la commande VueUIInput", "ErrorMsg"}}, false, {})
      return
    end
    
    local parts = vim.split(args, ' ')
    local id = parts[1]
    local label = parts[2] or "Input"
    
    -- Parse options from the remaining arguments
    local options_str = table.concat(parts, ' ', 3)
    local options = {}
    
    if options_str and options_str ~= "" then
      local success, parsed_options = pcall(vim.fn.json_decode, options_str)
      if success then
        options = parsed_options
      end
    end
    
    -- Create and render the input
    local input = M.input.create(id, label, options)
    if input then
      input:render()
      vim.api.nvim_echo({{"[VueUI] Input created: " .. id, "Normal"}}, false, {})
    else
      vim.api.nvim_echo({{"[VueUI] Failed to create input", "ErrorMsg"}}, false, {})
    end
  end, { nargs = '+' })
  
  -- Commande pour créer une modal
  vim.api.nvim_create_user_command('VueUIModal', function(opts)
    local args = opts.args
    if not args or args == "" then
      vim.api.nvim_echo({{"[VueUI] Arguments manquants pour la commande VueUIModal", "ErrorMsg"}}, false, {})
      return
    end
    
    local parts = vim.split(args, ' ')
    local id = parts[1]
    local title = parts[2] or "Modal"
    
    -- Parse options from the remaining arguments
    local options_str = table.concat(parts, ' ', 3)
    local options = {}
    
    if options_str and options_str ~= "" then
      local success, parsed_options = pcall(vim.fn.json_decode, options_str)
      if success then
        options = parsed_options
      end
    end
    
    -- Create and render the modal
    local modal = M.modal.create(id, title, options)
    if modal then
      modal:render()
      vim.api.nvim_echo({{"[VueUI] Modal created: " .. id, "Normal"}}, false, {})
    else
      vim.api.nvim_echo({{"[VueUI] Failed to create modal", "ErrorMsg"}}, false, {})
    end
  end, { nargs = '+' })
  
  -- Command to create a Select component
  print('[VUE-UI] Enregistrement de la commande VueUISelect')
  vim.api.nvim_create_user_command('VueUISelect', function(opts)
    local args = opts.args
    if not args or args == "" then
      vim.api.nvim_echo({{"[VueUI] Arguments manquants pour la commande VueUISelect", "ErrorMsg"}}, false, {})
      return
    end
    
    local parts = vim.split(args, ' ')
    local id = parts[1]
    local title = parts[2] or "Select Component"
    
    -- Parse options from the remaining arguments
    local options_str = table.concat(parts, ' ', 3)
    local options = {}
    
    if options_str and options_str ~= "" then
      local success, parsed_options = pcall(vim.fn.json_decode, options_str)
      if success then
        options = parsed_options
      else
        -- Fallback to some default options if JSON parsing fails
        options = {
          multi = false,
          options = {
            { id = "option1", text = "Option 1", value = "value1" },
            { id = "option2", text = "Option 2", value = "value2" },
            { id = "option3", text = "Option 3", value = "value3" }
          }
        }
      end
    else
      -- Default options if none provided
      options = {
        multi = false,
        options = {
          { id = "option1", text = "Option 1", value = "value1" },
          { id = "option2", text = "Option 2", value = "value2" },
          { id = "option3", text = "Option 3", value = "value3" }
        }
      }
    end
    
    -- Create and open the select component
    local select = M.select.create(id, title, options)
    if select then
      select:open()
      vim.api.nvim_echo({{"[VueUI] Select component created and opened: " .. id, "Normal"}}, false, {})
    else
      vim.api.nvim_echo({{"[VueUI] Failed to create select component", "ErrorMsg"}}, false, {})
    end
  end, { nargs = '+' })
  
  -- Command to save the event log
  vim.api.nvim_create_user_command('VueUISaveEventLog', function(opts)
    local path = opts.args
    local success = M.save_event_log(path)
    
    if success then
      vim.api.nvim_echo({{"[VueUI] Event log saved to: " .. (path or M.event_log_path or "default location"), "Normal"}}, false, {})
    else
      vim.api.nvim_echo({{"[VueUI] Error saving event log", "ErrorMsg"}}, false, {})
    end
  end, { nargs = '?' })
  
  -- Command to clear the event log
  vim.api.nvim_create_user_command('VueUIClearEventLog', function()
    M.clear_event_log()
    vim.api.nvim_echo({{"[VueUI] Event log cleared", "Normal"}}, false, {})
  end, {})
  
  print('[VUE-UI] Toutes les commandes utilisateur ont été enregistrées avec succès')
end

-- Initialise la librairie
function M.setup(opts)
  -- Fusionner les options avec la configuration par défaut
  local config = vim.tbl_deep_extend("force", default_config, opts or {})
  
  -- Configurer le pont d'événements
  event_bridge.setup(config)
  
  -- Définir les groupes de surbrillance
  M.define_highlight_groups(config.highlight_groups)
  
  -- Exposer les composants
  M.button = require('vue-ui.components.button')
  M.input = require('vue-ui.components.input')
  M.modal = require('vue-ui.components.modal')
  M.select = require('vue-ui.components.select')
  
  -- Exposer les utilitaires
  M.render = require('vue-ui.utils.render')
  M.validation = require('vue-ui.utils.validation')
  
  -- Exposer les événements
  M.events = schema.EVENT_TYPES
  
  -- Exposer les méthodes du pont d'événements
  M.emit = event_bridge.emit
  M.receive = event_bridge.receive
  M.save_event_log = event_bridge.save_event_log
  M.clear_event_log = event_bridge.clear_event_log
  
  -- Définir la fonction de réception des événements TypeScript
  vim.api.nvim_create_user_command('VueUIReceiveEvent', function(opts)
    local args = opts.args
    if not args or args == "" then
      vim.api.nvim_echo({{"[VueUI] Arguments manquants pour la commande VueUIReceiveEvent", "ErrorMsg"}}, false, {})
      return
    end
    
    -- Analyser les arguments (format: event_name data_json)
    local event_name, data_json = args:match("^(%S+)%s+(.+)$")
    if not event_name or not data_json then
      vim.api.nvim_echo({{"[VueUI] Format d'arguments invalide pour la commande VueUIReceiveEvent", "ErrorMsg"}}, false, {})
      return
    end
    
    -- Décoder les données JSON
    local ok, data = pcall(vim.fn.json_decode, data_json)
    if not ok or not data then
      vim.api.nvim_echo({{"[VueUI] Données JSON invalides pour la commande VueUIReceiveEvent", "ErrorMsg"}}, false, {})
      return
    end
    
    -- Recevoir l'événement
    event_bridge.receive(event_name, data)
  end, { nargs = '+' })
  
  return M
end

-- Fonction pour créer un test de composant
function M.create_test(component_type, component_id, options)
  -- Créer un fichier de test Vader
  local test_file = vim.fn.tempname() .. '.vader'
  local file = io.open(test_file, 'w')
  
  if not file then
    vim.api.nvim_echo({{"[VueUI] Impossible de créer le fichier de test", "ErrorMsg"}}, false, {})
    return nil
  end
  
  -- Écrire l'en-tête du test
  file:write("# Test automatisé pour le composant " .. component_type .. " avec ID " .. component_id .. "\n\n")
  
  -- Écrire les étapes de configuration
  file:write("Given:\n")
  file:write("  " .. component_type .. " component setup\n\n")
  
  -- Écrire les étapes d'exécution
  file:write("Execute:\n")
  file:write("  let g:test_component_id = '" .. component_id .. "'\n")
  file:write("  let g:test_component_type = '" .. component_type .. "'\n")
  
  -- Sérialiser les options en JSON
  if options then
    local ok, options_json = pcall(vim.fn.json_encode, options)
    if ok then
      file:write("  let g:test_component_options = '" .. options_json:gsub("'", "\\'") .. "'\n")
    end
  end
  
  -- Ajouter les commandes de test spécifiques au type de composant
  if component_type == "button" then
    file:write("  " .. "call vue#test#create_button(g:test_component_id, 'Test Button', g:test_component_options)\n")
    file:write("  " .. "call vue#test#click_button(g:test_component_id)\n")
  elseif component_type == "input" then
    file:write("  " .. "call vue#test#create_input(g:test_component_id, 'Test Input', g:test_component_options)\n")
    file:write("  " .. "call vue#test#set_input_value(g:test_component_id, 'Test Value')\n")
  elseif component_type == "select" then
    file:write("  " .. "call vue#test#create_select(g:test_component_id, 'Test Select', g:test_component_options)\n")
    file:write("  " .. "call vue#test#open_select(g:test_component_id)\n")
    file:write("  " .. "call vue#test#select_option(g:test_component_id, 0)\n")
  end
  
  -- Fermer le fichier
  file:close()
  
  -- Ouvrir le fichier de test dans Neovim
  vim.cmd("edit " .. test_file)
  
  return test_file
end

-- Register all commands at module level
print('[VUE-UI] Enregistrement des commandes au niveau du module...')
M.define_commands()
print('[VUE-UI] Commandes enregistrées au niveau du module')

-- Load components
M.button = require('vue-ui.components.button')
M.input = require('vue-ui.components.input')
M.modal = require('vue-ui.components.modal')
M.select = require('vue-ui.components.select')

-- Initialize the bridge
print('[VUE-UI] Initializing bridge core...')
M.bridge = require('vue-ui.core.bridge')
M.bridge.initialize()

-- Initialize bridge test module
print('[VUE-UI] Initializing bridge test module...')
M.bridge_test = require('vue-ui.core.bridge_test')
M.bridge_test.initialize()
print('[VUE-UI] Bridge initialized successfully')

return M
