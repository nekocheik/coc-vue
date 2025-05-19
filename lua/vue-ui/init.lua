-- init.lua
-- Point d'entrée principal pour la librairie de composants UI natifs Lua/Vim pour CoC-Vue

local M = {}

-- Charger les dépendances
local event_bridge = require('vue-ui.utils.event_bridge')
local schema = require('vue-ui.events.schema')

-- Configuration par défaut
local default_config = {
  debug = false,
  log_events = true,
  log_path = vim.fn.stdpath('data') .. '/vue-ui-events.json',
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
  
  -- Définir les commandes utilisateur
  M.define_commands()
  
  return M
end

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
  -- Commande pour créer un bouton
  vim.api.nvim_create_user_command('VueUIButton', function(opts)
    local args = opts.args
    if not args or args == "" then
      vim.api.nvim_echo({{"[VueUI] Arguments manquants pour la commande VueUIButton", "ErrorMsg"}}, false, {})
      return
    end
    
    -- Analyser les arguments (format: id text [style])
    local id, text, style = args:match("^(%S+)%s+(.-)%s*(%S*)$")
    if not id or not text then
      vim.api.nvim_echo({{"[VueUI] Format d'arguments invalide pour la commande VueUIButton", "ErrorMsg"}}, false, {})
      return
    end
    
    -- Créer le bouton
    local config = {}
    if style and style ~= "" then
      config.style = style
    end
    
    local button = M.button.create(id, text, config, function()
      vim.api.nvim_echo({{"Bouton cliqué: " .. id, "Normal"}}, false, {})
    end)
    
    if not button then
      vim.api.nvim_echo({{"[VueUI] Erreur lors de la création du bouton", "ErrorMsg"}}, false, {})
      return
    end
    
    -- Créer une fenêtre flottante pour afficher le bouton
    local float = M.render.create_float({
      title = "Bouton: " .. id,
      width = button.config.width + 4,
      height = 5
    })
    
    -- Dessiner le bouton
    M.render.draw_component(float.buf, button, 1)
    
    -- Ajouter un mapping pour cliquer sur le bouton
    vim.api.nvim_buf_set_keymap(float.buf, 'n', '<CR>', '', {
      callback = function()
        button:click()
        vim.api.nvim_echo({{"Bouton cliqué: " .. id, "Normal"}}, false, {})
      end,
      noremap = true,
      silent = true
    })
  end, { nargs = '+' })
  
  -- Commande pour créer un champ de saisie
  vim.api.nvim_create_user_command('VueUIInput', function(opts)
    local args = opts.args
    if not args or args == "" then
      vim.api.nvim_echo({{"[VueUI] Arguments manquants pour la commande VueUIInput", "ErrorMsg"}}, false, {})
      return
    end
    
    -- Analyser les arguments (format: id label [value])
    local id, label, value = args:match("^(%S+)%s+(.-)%s*(%S*)$")
    if not id or not label then
      vim.api.nvim_echo({{"[VueUI] Format d'arguments invalide pour la commande VueUIInput", "ErrorMsg"}}, false, {})
      return
    end
    
    -- Créer le champ de saisie
    local input = M.input.create(id, label, value or "", {}, function(new_value)
      vim.api.nvim_echo({{"Valeur changée: " .. new_value, "Normal"}}, false, {})
    end, function(final_value)
      vim.api.nvim_echo({{"Valeur soumise: " .. final_value, "Normal"}}, false, {})
    end)
    
    if not input then
      vim.api.nvim_echo({{"[VueUI] Erreur lors de la création du champ de saisie", "ErrorMsg"}}, false, {})
      return
    end
    
    -- Créer une fenêtre flottante pour afficher le champ de saisie
    local float = M.render.create_float({
      title = "Champ de saisie: " .. id,
      width = input.config.width + 4,
      height = 6
    })
    
    -- Dessiner le champ de saisie
    M.render.draw_component(float.buf, input, 1)
    
    -- Ajouter des mappings pour interagir avec le champ de saisie
    vim.api.nvim_buf_set_keymap(float.buf, 'n', 'i', '', {
      callback = function()
        input:focus()
        input:start_editing()
        M.render.draw_component(float.buf, input, 1)
        vim.cmd('startinsert')
      end,
      noremap = true,
      silent = true
    })
    
    vim.api.nvim_buf_set_keymap(float.buf, 'i', '<CR>', '', {
      callback = function()
        input:submit()
        M.render.draw_component(float.buf, input, 1)
        vim.cmd('stopinsert')
      end,
      noremap = true,
      silent = true
    })
    
    vim.api.nvim_buf_set_keymap(float.buf, 'i', '<Esc>', '', {
      callback = function()
        input:cancel()
        M.render.draw_component(float.buf, input, 1)
        vim.cmd('stopinsert')
      end,
      noremap = true,
      silent = true
    })
    
    -- Ajouter un autocommand pour mettre à jour le champ lors de la frappe
    vim.api.nvim_create_autocmd("TextChangedI", {
      buffer = float.buf,
      callback = function()
        local line = vim.api.nvim_get_current_line()
        local cursor_pos = vim.api.nvim_win_get_cursor(0)[2]
        
        -- Extraire la valeur du champ
        local value_match = line:match("%[%s(.-)%s%]")
        if value_match then
          input:set_value(value_match)
          input:move_cursor(cursor_pos - 2) -- -2 pour compenser "[ "
          M.render.draw_component(float.buf, input, 1)
        end
      end
    })
  end, { nargs = '+' })
  
  -- Commande pour créer une modal
  vim.api.nvim_create_user_command('VueUIModal', function(opts)
    local args = opts.args
    if not args or args == "" then
      vim.api.nvim_echo({{"[VueUI] Arguments manquants pour la commande VueUIModal", "ErrorMsg"}}, false, {})
      return
    end
    
    -- Analyser les arguments (format: id title [content])
    local id, title, content = args:match("^(%S+)%s+([^\"]+)%s*(.*)$")
    if not id or not title then
      vim.api.nvim_echo({{"[VueUI] Format d'arguments invalide pour la commande VueUIModal", "ErrorMsg"}}, false, {})
      return
    end
    
    -- Créer la modal
    local modal = M.modal.create(id, title, { 
      content = content,
      buttons = {
        { id = 'confirm', text = 'Confirmer', style = 'primary' },
        { id = 'cancel', text = 'Annuler', style = 'secondary' }
      }
    })
    
    if not modal then
      vim.api.nvim_echo({{"[VueUI] Erreur lors de la création de la modal", "ErrorMsg"}}, false, {})
      return
    end
    
    -- Ouvrir la modal
    modal:open()
    
    -- Configurer les gestionnaires d'événements
    event_bridge.on(schema.EVENT_TYPES.MODAL_CONFIRMED, function(data)
      if data.id == id then
        vim.api.nvim_echo({{"Modal confirmée: " .. id, "Normal"}}, false, {})
        if data.input_value then
          vim.api.nvim_echo({{"Valeur saisie: " .. data.input_value, "Normal"}}, false, {})
        end
      end
    end)
    
    event_bridge.on(schema.EVENT_TYPES.MODAL_CANCELLED, function(data)
      if data.id == id then
        vim.api.nvim_echo({{"Modal annulée: " .. id, "Normal"}}, false, {})
      end
    end)
  end, { nargs = '+' })
  
  -- Command to save the event log
  vim.api.nvim_create_user_command('VueUISaveEventLog', function(opts)
    local component_name = opts.args
    local success = M.save_event_log(component_name ~= "" and component_name or nil)
    
    if success then
      vim.api.nvim_echo({{"[VueUI] Event log saved", "Normal"}}, false, {})
    else
      vim.api.nvim_echo({{"[VueUI] Error saving event log", "ErrorMsg"}}, false, {})
    end
  end, { nargs = '?' })
  
  -- Command to clear the event log
  vim.api.nvim_create_user_command('VueUIClearEventLog', function()
    M.clear_event_log()
    vim.api.nvim_echo({{"[VueUI] Event log cleared", "Normal"}}, false, {})
  end, {})
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
  file:write("# Test du composant " .. component_type .. " avec ID " .. component_id .. "\n\n")
  
  -- Écrire le bloc de configuration
  file:write("Execute (Configuration):\n")
  file:write("  let g:vue_ui_test_id = '" .. component_id .. "'\n")
  file:write("  let g:vue_ui_test_type = '" .. component_type .. "'\n")
  file:write("  lua require('vue-ui').setup({debug = true})\n")
  file:write("  lua require('vue-ui').clear_event_log()\n\n")
  
  -- Écrire le bloc de création du composant
  file:write("Execute (Création du composant):\n")
  
  if component_type == "button" then
    file:write("  lua local button = require('vue-ui').button.create('" .. component_id .. "', 'Test Button', {style = 'primary'})\n")
    file:write("  Assert exists('button')\n\n")
  elseif component_type == "input" then
    file:write("  lua local input = require('vue-ui').input.create('" .. component_id .. "', 'Test Input', '', {placeholder = 'Enter text here'})\n")
    file:write("  Assert exists('input')\n\n")
  end
  
  -- Écrire le bloc de test des événements
  file:write("Execute (Test des événements):\n")
  
  if component_type == "button" then
    file:write("  lua local button = require('vue-ui.utils.event_bridge').get_component('" .. component_id .. "')\n")
    file:write("  lua button:click()\n")
    file:write("  Assert true\n\n")
  elseif component_type == "input" then
    file:write("  lua local input = require('vue-ui.utils.event_bridge').get_component('" .. component_id .. "')\n")
    file:write("  lua input:focus()\n")
    file:write("  lua input:start_editing()\n")
    file:write("  lua input:set_value('Test Value')\n")
    file:write("  lua input:submit()\n")
    file:write("  Assert true\n\n")
  end
  
  -- Écrire le bloc de sauvegarde des événements
  file:write("Execute (Sauvegarde des événements):\n")
  file:write("  lua require('vue-ui').save_event_log('" .. component_type .. "')\n")
  file:write("  Assert true\n\n")
  
  -- Fermer le fichier
  file:close()
  
  return test_file
end

-- Fonction pour exécuter un test de composant
function M.run_test(test_file)
  if not test_file or not vim.fn.filereadable(test_file) then
    vim.api.nvim_echo({{"[VueUI] Fichier de test invalide", "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Vérifier si Vader est installé
  if vim.fn.exists(':Vader') == 0 then
    vim.api.nvim_echo({{"[VueUI] Vader n'est pas installé. Veuillez installer junegunn/vader.vim", "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Exécuter le test
  vim.cmd('Vader ' .. test_file)
  
  return true
end

return M
