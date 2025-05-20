-- button.lua
-- Button component for Vue user interface

local M = {}
local event_bridge = require('vue-ui.utils.event_bridge')
local render_utils = require('vue-ui.utils.render')
local validation = require('vue-ui.utils.validation')
local schema = require('vue-ui.events.schema')

-- Default configuration
local default_config = {
  style = "default", -- default, primary, success, warning, danger
  width = 20,
  height = 1,
  border = true,
  text_align = "center", -- left, center, right
  enabled = true
}

-- Button Class
local Button = {}
Button.__index = Button

-- Create a new button
function M.create(id, text, config, callback)
  -- Validate ID
  if not validation.is_valid_id(id) then
    vim.api.nvim_echo({{"[VueUI] Invalid button ID: " .. id, "ErrorMsg"}}, false, {})
    return nil
  end
  
  -- Create button instance
  local button = setmetatable({
    id = id,
    text = text or "Button",
    config = vim.tbl_deep_extend("force", default_config, config or {}),
    callback = callback,
    is_focused = false,
    is_disabled = not (config and config.enabled ~= false)
  }, Button)
  
  -- Register button in global registry
  event_bridge.register_component(id, button)
  
  -- Emit creation event
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_CREATED, {
    id = id,
    component_type = "button",
    text = text,
    config = button.config
  })
  
  return button
end

-- Create a button from event data
function M.create_from_data(data)
  return M.create(data.id, data.text, data.config)
end

-- Button render method
function Button:render()
  local width = self.config.width
  local text = self.text
  
  -- Determine style
  local style_name = self.config.style
  if self.is_focused then
    style_name = "focused"
  elseif self.is_disabled then
    style_name = "disabled"
  end
  
  -- Format text according to alignment
  local formatted_text = text
  if self.config.text_align == "center" then
    formatted_text = render_utils.center_text(text, width)
  elseif self.config.text_align == "left" then
    formatted_text = render_utils.left_align(text, width)
  elseif self.config.text_align == "right" then
    formatted_text = render_utils.right_align(text, width)
  end
  
  -- Create render
  local lines = {}
  local highlights = {}
  
  if self.config.border then
    -- With border
    local top = "┌" .. string.rep("─", width) .. "┐"
    local bottom = "└" .. string.rep("─", width) .. "┘"
    local middle = "│" .. formatted_text .. "│"
    
    table.insert(lines, top)
    table.insert(lines, middle)
    table.insert(lines, bottom)
    
    -- Add highlights
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
    -- Without border
    local prefix = self.is_disabled and "[ " or "[ "
    local suffix = self.is_disabled and " ]" or " ]"
    local button_text = prefix .. formatted_text .. suffix
    
    table.insert(lines, button_text)
    
    -- Add highlights
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
    width = width + (self.config.border and 2 or 4), -- +2 for borders or +4 for [ ]
    height = self.config.border and 3 or 1
  }
end

-- Button click method
function Button:click()
  if self.is_disabled then
    return false
  end
  
  -- Emit click event
  event_bridge.emit(schema.EVENT_TYPES.BUTTON_CLICKED, {
    id = self.id,
    text = self.text
  })
  
  -- Execute callback if defined
  if self.callback then
    self.callback()
  end
  
  return true
end

-- Method to focus the button
function Button:focus()
  if self.is_focused or self.is_disabled then
    return false
  end
  
  self.is_focused = true
  
  -- Emit focus event
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_FOCUSED, {
    id = self.id
  })
  
  return true
end

-- Method to remove focus from button
function Button:blur()
  if not self.is_focused then
    return false
  end
  
  self.is_focused = false
  
  -- Emit blur event
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_BLURRED, {
    id = self.id
  })
  
  return true
end

-- Method to enable/disable button
function Button:set_enabled(enabled)
  if self.is_disabled == (not enabled) then
    return false
  end
  
  self.is_disabled = not enabled
  
  -- Emit update event
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_UPDATED, {
    id = self.id,
    changes = {
      enabled = enabled
    }
  })
  
  return true
end

-- Method to update button text
function Button:set_text(text)
  if self.text == text then
    return false
  end
  
  self.text = text
  
  -- Emit update event
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_UPDATED, {
    id = self.id,
    changes = {
      text = text
    }
  })
  
  return true
end

-- Method to update button configuration
function Button:update(changes)
  if not changes then
    return false
  end
  
  -- Update properties
  if changes.text then
    self:set_text(changes.text)
  end
  
  if changes.enabled ~= nil then
    self:set_enabled(changes.enabled)
  end
  
  -- Update configuration
  if changes.config then
    self.config = vim.tbl_deep_extend("force", self.config, changes.config)
    
    -- Emit update event
    event_bridge.emit(schema.EVENT_TYPES.COMPONENT_UPDATED, {
      id = self.id,
      changes = {
        config = changes.config
      }
    })
  end
  
  return true
end

-- Method to destroy button
function Button:destroy()
  -- Emit destruction event
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_DESTROYED, {
    id = self.id
  })
  
  -- Remove from global registry
  event_bridge.unregister_component(self.id)
  
  return true
end

return M
