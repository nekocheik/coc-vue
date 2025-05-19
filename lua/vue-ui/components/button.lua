-- button.lua
-- Composant bouton pour l'interface utilisateur Vue

local M = {}
local event_bridge = require('vue-ui.utils.event_bridge')
local render_utils = require('vue-ui.utils.render')
local validation = require('vue-ui.utils.validation')
local schema = require('vue-ui.events.schema')

-- Configuration par défaut
local default_config = {
  style = "default", -- default, primary, success, warning, danger
  width = 20,
  height = 1,
  border = true,
  text_align = "center", -- left, center, right
  enabled = true
}

-- Classe Button
local Button = {}
Button.__index = Button

-- Crée un nouveau bouton
function M.create(id, text, config, callback)
  -- Valider l'ID
  if not validation.is_valid_id(id) then
    vim.api.nvim_echo({{"[VueUI] ID de bouton invalide: " .. id, "ErrorMsg"}}, false, {})
    return nil
  end
  
  -- Créer l'instance du bouton
  local button = setmetatable({
    id = id,
    text = text or "Button",
    config = vim.tbl_deep_extend("force", default_config, config or {}),
    callback = callback,
    is_focused = false,
    is_disabled = not (config and config.enabled ~= false)
  }, Button)
  
  -- Enregistrer le bouton dans le registre global
  event_bridge.register_component(id, button)
  
  -- Émettre un événement de création
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_CREATED, {
    id = id,
    component_type = "button",
    text = text,
    config = button.config
  })
  
  return button
end

-- Crée un bouton à partir des données d'événement
function M.create_from_data(data)
  return M.create(data.id, data.text, data.config)
end

-- Méthode de rendu du bouton
function Button:render()
  local width = self.config.width
  local text = self.text
  
  -- Déterminer le style
  local style_name = self.config.style
  if self.is_focused then
    style_name = "focused"
  elseif self.is_disabled then
    style_name = "disabled"
  end
  
  -- Formater le texte selon l'alignement
  local formatted_text = text
  if self.config.text_align == "center" then
    formatted_text = render_utils.center_text(text, width)
  elseif self.config.text_align == "left" then
    formatted_text = render_utils.left_align(text, width)
  elseif self.config.text_align == "right" then
    formatted_text = render_utils.right_align(text, width)
  end
  
  -- Créer le rendu
  local lines = {}
  local highlights = {}
  
  if self.config.border then
    -- Avec bordure
    local top = "┌" .. string.rep("─", width) .. "┐"
    local bottom = "└" .. string.rep("─", width) .. "┘"
    local middle = "│" .. formatted_text .. "│"
    
    table.insert(lines, top)
    table.insert(lines, middle)
    table.insert(lines, bottom)
    
    -- Ajouter les highlights
    table.insert(highlights, {
      group = style_name,
      line = 0,
      col_start = 0,
      col_end = -1
    })
    table.insert(highlights, {
      group = style_name,
      line = 1,
      col_start = 0,
      col_end = -1
    })
    table.insert(highlights, {
      group = style_name,
      line = 2,
      col_start = 0,
      col_end = -1
    })
  else
    -- Sans bordure
    local prefix = self.is_disabled and "[ " or "[ "
    local suffix = self.is_disabled and " ]" or " ]"
    local button_text = prefix .. formatted_text .. suffix
    
    table.insert(lines, button_text)
    
    -- Ajouter les highlights
    table.insert(highlights, {
      group = style_name,
      line = 0,
      col_start = 0,
      col_end = -1
    })
  end
  
  return {
    lines = lines,
    highlights = highlights,
    width = width + (self.config.border and 2 or 4), -- +2 pour les bordures ou +4 pour [ ]
    height = self.config.border and 3 or 1
  }
end

-- Méthode de clic sur le bouton
function Button:click()
  if self.is_disabled then
    return false
  end
  
  -- Émettre un événement de clic
  event_bridge.emit(schema.EVENT_TYPES.BUTTON_CLICKED, {
    id = self.id,
    text = self.text
  })
  
  -- Exécuter le callback si défini
  if self.callback then
    self.callback()
  end
  
  return true
end

-- Méthode pour donner le focus au bouton
function Button:focus()
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

-- Méthode pour retirer le focus du bouton
function Button:blur()
  if not self.is_focused then
    return false
  end
  
  self.is_focused = false
  
  -- Émettre un événement de perte de focus
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_BLURRED, {
    id = self.id
  })
  
  return true
end

-- Méthode pour activer/désactiver le bouton
function Button:set_enabled(enabled)
  if self.is_disabled == (not enabled) then
    return false
  end
  
  self.is_disabled = not enabled
  
  -- Émettre un événement de mise à jour
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_UPDATED, {
    id = self.id,
    changes = {
      enabled = enabled
    }
  })
  
  return true
end

-- Méthode pour mettre à jour le texte du bouton
function Button:set_text(text)
  if self.text == text then
    return false
  end
  
  self.text = text
  
  -- Émettre un événement de mise à jour
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_UPDATED, {
    id = self.id,
    changes = {
      text = text
    }
  })
  
  return true
end

-- Méthode pour mettre à jour la configuration du bouton
function Button:update(changes)
  if not changes then
    return false
  end
  
  -- Mettre à jour les propriétés
  if changes.text then
    self:set_text(changes.text)
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

-- Méthode pour détruire le bouton
function Button:destroy()
  -- Émettre un événement de destruction
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_DESTROYED, {
    id = self.id
  })
  
  -- Supprimer du registre global
  event_bridge.unregister_component(self.id)
  
  return true
end

return M
