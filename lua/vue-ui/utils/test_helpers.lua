--- Utilitaires pour les tests
-- @module test_helpers
-- @author Cheik Kone
-- @license MIT
-- @copyright Cheik Kone 2025

local validation = require('vue-ui.utils.validation')
local schema = require('vue-ui.events.schema')

local M = {}

-- Variables globales pour les tests
local test_events = {}
local test_buffers = {}
local test_windows = {}
local test_components = {}
local test_key_inputs = {}

--- Détecte si nous sommes dans un environnement de test
-- @return boolean True si nous sommes dans un environnement de test
function M.is_test_env()
  -- Vérifie si nous sommes dans un environnement headless ou sans UI
  local has_ui = (vim.fn.has('nvim-0.5') == 1) and (#vim.api.nvim_list_uis() > 0)
  return not has_ui
end

--- Configure l'environnement de test
-- @param config table Configuration optionnelle
function M.setup_test_env(config)
  config = config or {}
  
  -- Réinitialiser les événements
  test_events = {}
  test_buffers = {}
  test_windows = {}
  test_components = {}
  
  -- Générer un timestamp unique pour les tests
  _G.test_timestamp = os.time()
  
  -- Enregistrer la configuration
  _G.test_config = config
  
  return true
end

--- Simulates event emission in test mode
-- @param event_type string Event type (from schema.EVENT_TYPES)
-- @param data table Event data
-- @return boolean True if the emission was successful
function M.emit_test_event(event_type, data)
  validation.validate_not_empty(event_type, "Event type cannot be empty")
  data = data or {}
  
  -- Add timestamp
  data.timestamp = data.timestamp or os.time()
  
  -- Add event to the list
  table.insert(test_events, {
    event = event_type,
    data = data,
    timestamp = data.timestamp
  })
  
  -- Debug log
  if _G.test_config and _G.test_config.debug then
    print(string.format("[TEST] Event emission: %s", event_type))
    print(string.format("[TEST] Data: %s", vim.inspect(data)))
  end
  
  return true
end

--- Récupère les événements de test
-- @return table Liste des événements de test
function M.get_test_events()
  return test_events
end

--- Vérifie si un événement spécifique a été émis
-- @param event_type string Type d'événement à rechercher
-- @param criteria table|nil Critères de recherche optionnels
-- @return boolean True si l'événement a été trouvé
function M.has_event(event_type, criteria)
  validation.validate_not_empty(event_type, "Event type cannot be empty")
  criteria = criteria or {}
  
  for _, event in ipairs(test_events) do
    if event.event == event_type then
      local match = true
      
      -- Vérifier les critères
      for key, value in pairs(criteria) do
        if event.data[key] ~= value then
          match = false
          break
        end
      end
      
      if match then
        return true
      end
    end
  end
  
  return false
end

--- Réinitialise les événements de test
function M.reset_test_events()
  test_events = {}
end

--- Simule la création d'un buffer
-- @param lines table Lignes du buffer
-- @param options table Options du buffer
-- @return number ID du buffer
function M.create_test_buffer(lines, options)
  lines = lines or {}
  options = options or {}
  
  local buffer_id = #test_buffers + 1
  
  test_buffers[buffer_id] = {
    lines = lines,
    options = options,
    valid = true
  }
  
  return buffer_id
end

--- Simule la création d'une fenêtre
-- @param buffer_id number ID du buffer
-- @param options table Options de la fenêtre
-- @return number ID de la fenêtre
function M.create_test_window(buffer_id, options)
  options = options or {}
  
  local window_id = #test_windows + 1
  
  test_windows[window_id] = {
    buffer_id = buffer_id,
    options = options,
    valid = true
  }
  
  return window_id
end

--- Vérifie si un buffer est valide
-- @param buffer_id number ID du buffer
-- @return boolean True si le buffer est valide
function M.is_buffer_valid(buffer_id)
  return test_buffers[buffer_id] ~= nil and test_buffers[buffer_id].valid
end

--- Vérifie si une fenêtre est valide
-- @param window_id number ID de la fenêtre
-- @return boolean True si la fenêtre est valide
function M.is_window_valid(window_id)
  return test_windows[window_id] ~= nil and test_windows[window_id].valid
end

--- Enregistre un composant pour les tests
-- @param id string ID du composant
-- @param component table Instance du composant
function M.register_test_component(id, component)
  validation.validate_not_empty(id, "L'ID du composant ne peut pas être vide")
  test_components[id] = component
end

--- Récupère un composant de test
-- @param id string ID du composant
-- @return table|nil Instance du composant ou nil
function M.get_test_component(id)
  return test_components[id]
end

--- Nettoie l'environnement de test
function M.cleanup_test_env()
  -- Réinitialiser les événements
  test_events = {}
  
  -- Fermer les buffers et fenêtres
  for id, _ in pairs(test_buffers) do
    test_buffers[id].valid = false
  end
  
  for id, _ in pairs(test_windows) do
    test_windows[id].valid = false
  end
  
  -- Nettoyer les composants
  test_components = {}
  
  -- Nettoyer les variables globales
  _G.test_modal = nil
  _G.test_select = nil
  _G.test_listview = nil
  _G.test_notification = nil
  _G.test_input = nil
  _G.test_checkbox = nil
  _G.test_radio = nil
  _G.test_button = nil
  _G.test_tabview = nil
  
  return true
end

--- Simule une saisie clavier
-- @param key string Touche à simuler ("<Up>", "<Down>", "<Left>", "<Right>", "<Enter>", "<Esc>", etc.)
-- @param component table Composant cible (optionnel)
-- @return boolean True si la simulation a réussi
function M.simulate_key_input(key, component)
  validation.validate_not_empty(key, "La touche ne peut pas être vide")
  
  -- Ajouter l'entrée clavier à la liste
  table.insert(test_key_inputs, {
    key = key,
    component_id = component and component.id or nil,
    timestamp = os.time()
  })
  
  -- Debug log
  if _G.test_config and _G.test_config.debug then
    print(string.format("[TEST] Key simulation: %s", key))
  end
  
  -- Process keyboard input based on the key
  if component then
    if key == "<Up>" and component.focus_prev_option then
      return component:focus_prev_option()
    elseif key == "<Down>" and component.focus_next_option then
      return component:focus_next_option()
    elseif key == "<Left>" and component.focus_prev_button then
      return component:focus_prev_button()
    elseif key == "<Right>" and component.focus_next_button then
      return component:focus_next_button()
    elseif key == "<Enter>" and component.confirm then
      return component:confirm()
    elseif key == "<Space>" and component.select_current_option then
      return component:select_current_option()
    elseif key == "<Esc>" and component.cancel then
      return component:cancel("key_escape")
    elseif key == "<Tab>" and component.focus_next_element then
      return component:focus_next_element()
    elseif key == "<S-Tab>" and component.focus_prev_element then
      return component:focus_prev_element()
    end
  end
  
  return false
end

--- Récupère les entrées clavier simulées
-- @return table Liste des entrées clavier simulées
function M.get_key_inputs()
  return test_key_inputs
end

--- Réinitialise les entrées clavier simulées
function M.reset_key_inputs()
  test_key_inputs = {}
end

--- Simule une séquence de touches
-- @param keys table Liste des touches à simuler
-- @param component table Composant cible (optionnel)
-- @return boolean True si toutes les simulations ont réussi
function M.simulate_key_sequence(keys, component)
  validation.validate_table(keys, "La séquence de touches doit être une table")
  
  local success = true
  for _, key in ipairs(keys) do
    local result = M.simulate_key_input(key, component)
    if not result then
      success = false
    end
  end
  
  return success
end

--- Simule un clic de souris
-- @param row number Ligne du clic (0-indexé)
-- @param col number Colonne du clic (0-indexé)
-- @param button string Bouton de la souris ("left", "right", "middle")
-- @param component table Composant cible (optionnel)
-- @return boolean True si la simulation a réussi
function M.simulate_mouse_click(row, col, button, component)
  validation.validate_number(row, "La ligne doit être un nombre")
  validation.validate_number(col, "La colonne doit être un nombre")
  button = button or "left"
  
  -- Ajouter le clic de souris à la liste
  table.insert(test_key_inputs, {
    type = "mouse",
    button = button,
    row = row,
    col = col,
    component_id = component and component.id or nil,
    timestamp = os.time()
  })
  
  -- Debug log
  if _G.test_config and _G.test_config.debug then
    print(string.format("[TEST] Mouse click simulation: %s (%d, %d)", button, row, col))
  end
  
  -- Process mouse click
  if component and component.handle_mouse_click then
    return component:handle_mouse_click(row, col, button)
  end
  
  return false
end

--- Sauvegarde les événements de test dans un fichier JSON
-- @param prefix string Préfixe du nom de fichier
-- @return boolean True si la sauvegarde a réussi
function M.save_test_events(prefix)
  prefix = prefix or 'test'
  local log_path = vim.fn.stdpath('data') .. '/vue-ui-test-events_' .. prefix .. '.json'
  
  -- Convertir les événements en JSON
  local json = vim.fn.json_encode(test_events)
  
  -- Écrire dans le fichier
  local file = io.open(log_path, 'w')
  if file then
    file:write(json)
    file:close()
    
    if _G.test_config and _G.test_config.debug then
      print(string.format("[TEST] Événements sauvegardés dans: %s", log_path))
    end
    
    return true
  end
  
  return false
end

return M
