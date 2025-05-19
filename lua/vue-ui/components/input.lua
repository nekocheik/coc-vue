-- input.lua
-- Composant champ de saisie pour l'interface utilisateur Vue

local M = {}
local event_bridge = require('vue-ui.utils.event_bridge')
local render_utils = require('vue-ui.utils.render')
local validation = require('vue-ui.utils.validation')
local schema = require('vue-ui.events.schema')

-- Configuration par défaut
local default_config = {
  style = "default", -- default, primary, success, warning, danger
  width = 30,
  height = 1,
  border = true,
  placeholder = "",
  password = false,
  enabled = true,
  max_length = nil,
  validator = nil
}

-- Classe Input
local Input = {}
Input.__index = Input

-- Crée un nouveau champ de saisie
function M.create(id, label, value, config, on_change, on_submit)
  -- Valider l'ID
  if not validation.is_valid_id(id) then
    vim.api.nvim_echo({{"[VueUI] ID de champ de saisie invalide: " .. id, "ErrorMsg"}}, false, {})
    return nil
  end
  
  -- Créer l'instance du champ de saisie
  local input = setmetatable({
    id = id,
    label = label or "",
    value = value or "",
    original_value = value or "",
    config = vim.tbl_deep_extend("force", default_config, config or {}),
    on_change = on_change,
    on_submit = on_submit,
    is_focused = false,
    is_disabled = not (config and config.enabled ~= false),
    cursor_pos = #(value or ""),
    is_editing = false
  }, Input)
  
  -- Enregistrer le champ de saisie dans le registre global
  event_bridge.register_component(id, input)
  
  -- Émettre un événement de création
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_CREATED, {
    id = id,
    component_type = "input",
    label = label,
    value = value,
    config = input.config
  })
  
  return input
end

-- Crée un champ de saisie à partir des données d'événement
function M.create_from_data(data)
  return M.create(data.id, data.label, data.value, data.config)
end

-- Méthode de rendu du champ de saisie
function Input:render()
  local width = self.config.width
  local value = self.value
  
  -- Si c'est un champ de mot de passe, masquer la valeur
  if self.config.password then
    value = string.rep("*", #value)
  end
  
  -- Si la valeur est vide et qu'il y a un placeholder, l'utiliser
  if value == "" and self.config.placeholder ~= "" and not self.is_focused then
    value = self.config.placeholder
  end
  
  -- Déterminer le style
  local style_name = self.config.style
  if self.is_focused then
    style_name = "focused"
  elseif self.is_disabled then
    style_name = "disabled"
  end
  
  -- Créer le rendu
  local lines = {}
  local highlights = {}
  
  -- Ajouter le label s'il existe
  if self.label and self.label ~= "" then
    table.insert(lines, self.label .. ":")
    table.insert(highlights, {
      group = style_name,
      line = #lines - 1,
      col_start = 0,
      col_end = #self.label + 1
    })
  end
  
  if self.config.border then
    -- Avec bordure
    local top = "┌" .. string.rep("─", width) .. "┐"
    local bottom = "└" .. string.rep("─", width) .. "┘"
    
    -- Préparer le contenu avec le curseur si nécessaire
    local content = value
    if self.is_focused and self.is_editing then
      -- Insérer le curseur à la position actuelle
      content = string.sub(value, 1, self.cursor_pos) .. "|" .. string.sub(value, self.cursor_pos + 1)
    end
    
    -- Tronquer si nécessaire
    content = render_utils.truncate(content, width)
    
    -- Compléter avec des espaces
    content = content .. string.rep(" ", width - vim.fn.strdisplaywidth(content))
    
    local middle = "│" .. content .. "│"
    
    table.insert(lines, top)
    table.insert(lines, middle)
    table.insert(lines, bottom)
    
    -- Ajouter les highlights
    table.insert(highlights, {
      group = style_name,
      line = #lines - 3,
      col_start = 0,
      col_end = -1
    })
    table.insert(highlights, {
      group = style_name,
      line = #lines - 2,
      col_start = 0,
      col_end = -1
    })
    table.insert(highlights, {
      group = style_name,
      line = #lines - 1,
      col_start = 0,
      col_end = -1
    })
  else
    -- Sans bordure
    -- Préparer le contenu avec le curseur si nécessaire
    local content = value
    if self.is_focused and self.is_editing then
      -- Insérer le curseur à la position actuelle
      content = string.sub(value, 1, self.cursor_pos) .. "|" .. string.sub(value, self.cursor_pos + 1)
    end
    
    -- Tronquer si nécessaire
    content = render_utils.truncate(content, width)
    
    -- Compléter avec des espaces
    content = content .. string.rep(" ", width - vim.fn.strdisplaywidth(content))
    
    local input_line = "[ " .. content .. " ]"
    
    table.insert(lines, input_line)
    
    -- Ajouter les highlights
    table.insert(highlights, {
      group = style_name,
      line = #lines - 1,
      col_start = 0,
      col_end = -1
    })
  end
  
  return {
    lines = lines,
    highlights = highlights,
    width = width + (self.config.border and 2 or 4), -- +2 pour les bordures ou +4 pour [ ]
    height = #lines
  }
end

-- Méthode pour définir la valeur du champ
function Input:set_value(value, silent)
  -- Vérifier les contraintes
  if self.config.max_length and #value > self.config.max_length then
    value = string.sub(value, 1, self.config.max_length)
  end
  
  -- Vérifier si la valeur a changé
  if self.value == value then
    return false
  end
  
  local previous_value = self.value
  self.value = value
  
  -- Ajuster la position du curseur si nécessaire
  if self.cursor_pos > #value then
    self.cursor_pos = #value
  end
  
  -- Valider la valeur si un validateur est défini
  local is_valid = true
  if self.config.validator then
    is_valid = self.config.validator(value)
  end
  
  -- Émettre un événement de changement si non silencieux
  if not silent then
    event_bridge.emit(schema.EVENT_TYPES.INPUT_CHANGED, {
      id = self.id,
      value = value,
      previous_value = previous_value,
      is_valid = is_valid
    })
    
    -- Appeler le callback de changement si défini
    if self.on_change then
      self.on_change(value, previous_value, is_valid)
    end
  end
  
  return true
end

-- Méthode pour démarrer l'édition
function Input:start_editing()
  if self.is_disabled or self.is_editing then
    return false
  end
  
  self.is_editing = true
  self.original_value = self.value
  
  return true
end

-- Méthode pour terminer l'édition
function Input:stop_editing(submit)
  if not self.is_editing then
    return false
  end
  
  self.is_editing = false
  
  if submit then
    -- Émettre un événement de soumission
    event_bridge.emit(schema.EVENT_TYPES.INPUT_SUBMITTED, {
      id = self.id,
      value = self.value
    })
    
    -- Appeler le callback de soumission si défini
    if self.on_submit then
      self.on_submit(self.value)
    end
  else
    -- Annuler les modifications
    self:set_value(self.original_value, true)
    
    -- Émettre un événement d'annulation
    event_bridge.emit(schema.EVENT_TYPES.INPUT_CANCELLED, {
      id = self.id
    })
  end
  
  return true
end

-- Méthode pour déplacer le curseur
function Input:move_cursor(position)
  if not self.is_editing then
    return false
  end
  
  -- Limiter la position aux bornes de la valeur
  position = math.max(0, math.min(position, #self.value))
  
  if self.cursor_pos == position then
    return false
  end
  
  self.cursor_pos = position
  return true
end

-- Méthode pour insérer du texte à la position du curseur
function Input:insert_text(text)
  if not self.is_editing or self.is_disabled then
    return false
  end
  
  -- Insérer le texte à la position du curseur
  local new_value = string.sub(self.value, 1, self.cursor_pos) .. text .. string.sub(self.value, self.cursor_pos + 1)
  
  -- Mettre à jour la valeur
  local success = self:set_value(new_value)
  
  -- Déplacer le curseur
  if success then
    self.cursor_pos = self.cursor_pos + #text
  end
  
  return success
end

-- Méthode pour supprimer du texte à la position du curseur
function Input:delete_text(count, before_cursor)
  if not self.is_editing or self.is_disabled then
    return false
  end
  
  count = count or 1
  
  if before_cursor then
    -- Supprimer avant le curseur (backspace)
    if self.cursor_pos == 0 then
      return false
    end
    
    local delete_count = math.min(count, self.cursor_pos)
    local new_value = string.sub(self.value, 1, self.cursor_pos - delete_count) .. string.sub(self.value, self.cursor_pos + 1)
    
    -- Mettre à jour la valeur
    local success = self:set_value(new_value)
    
    -- Déplacer le curseur
    if success then
      self.cursor_pos = self.cursor_pos - delete_count
    end
    
    return success
  else
    -- Supprimer après le curseur (delete)
    if self.cursor_pos == #self.value then
      return false
    end
    
    local delete_count = math.min(count, #self.value - self.cursor_pos)
    local new_value = string.sub(self.value, 1, self.cursor_pos) .. string.sub(self.value, self.cursor_pos + delete_count + 1)
    
    -- Mettre à jour la valeur
    return self:set_value(new_value)
  end
end

-- Méthode pour donner le focus au champ
function Input:focus()
  if self.is_focused or self.is_disabled then
    return false
  end
  
  self.is_focused = true
  
  -- Émettre un événement de focus
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_FOCUSED, {
    id = self.id
  })
  
  return true
end

-- Méthode pour retirer le focus du champ
function Input:blur()
  if not self.is_focused then
    return false
  end
  
  -- Si en mode édition, terminer l'édition
  if self.is_editing then
    self:stop_editing(true)
  end
  
  self.is_focused = false
  
  -- Émettre un événement de perte de focus
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_BLURRED, {
    id = self.id
  })
  
  return true
end

-- Méthode pour activer/désactiver le champ
function Input:set_enabled(enabled)
  if self.is_disabled == (not enabled) then
    return false
  end
  
  self.is_disabled = not enabled
  
  -- Si désactivé et en mode édition, terminer l'édition
  if self.is_disabled and self.is_editing then
    self:stop_editing(false)
  end
  
  -- Émettre un événement de mise à jour
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_UPDATED, {
    id = self.id,
    changes = {
      enabled = enabled
    }
  })
  
  return true
end

-- Méthode pour mettre à jour la configuration du champ
function Input:update(changes)
  if not changes then
    return false
  end
  
  -- Mettre à jour les propriétés
  if changes.value ~= nil then
    self:set_value(changes.value)
  end
  
  if changes.label ~= nil then
    self.label = changes.label
  end
  
  if changes.enabled ~= nil then
    self:set_enabled(changes.enabled)
  end
  
  -- Mettre à jour la configuration
  if changes.config then
    self.config = vim.tbl_deep_extend("force", self.config, changes.config)
    
    -- Émettre un événement de mise à jour
    event_bridge.emit(schema.EVENT_TYPES.COMPONENT_UPDATED, {
      id = self.id,
      changes = {
        config = changes.config
      }
    })
  end
  
  return true
end

-- Méthode pour soumettre la valeur
function Input:submit()
  if self.is_disabled then
    return false
  end
  
  -- Si en mode édition, terminer l'édition avec soumission
  if self.is_editing then
    return self:stop_editing(true)
  end
  
  -- Sinon, émettre directement un événement de soumission
  event_bridge.emit(schema.EVENT_TYPES.INPUT_SUBMITTED, {
    id = self.id,
    value = self.value
  })
  
  -- Appeler le callback de soumission si défini
  if self.on_submit then
    self.on_submit(self.value)
  end
  
  return true
end

-- Méthode pour annuler l'édition
function Input:cancel()
  if not self.is_editing then
    return false
  end
  
  return self:stop_editing(false)
end

-- Méthode pour détruire le champ
function Input:destroy()
  -- Émettre un événement de destruction
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_DESTROYED, {
    id = self.id
  })
  
  -- Supprimer du registre global
  event_bridge.unregister_component(self.id)
  
  return true
end

return M
