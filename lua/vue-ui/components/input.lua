-- input.lua
-- Input component for Vue user interface

local M = {}
local event_bridge = require('vue-ui.utils.event_bridge')
local render_utils = require('vue-ui.utils.render')
local validation = require('vue-ui.utils.validation')
local schema = require('vue-ui.events.schema')

-- Default configuration
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

-- Input Class
local Input = {}
Input.__index = Input

-- Create a new input field
function M.create(id, label, value, config, on_change, on_submit)
  -- Validate ID
  if not validation.is_valid_id(id) then
    vim.api.nvim_echo({{"[VueUI] Invalid input field ID: " .. id, "ErrorMsg"}}, false, {})
    return nil
  end
  
  -- Create input field instance
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
  
  -- Register input field in global registry
  event_bridge.register_component(id, input)
  
  -- Emit creation event
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_CREATED, {
    id = id,
    component_type = "input",
    label = label,
    value = value,
    config = input.config
  })
  
  return input
end

-- Create an input field from event data
function M.create_from_data(data)
  return M.create(data.id, data.label, data.value, data.config)
end

-- Input field render method
function Input:render()
  local width = self.config.width
  local value = self.value
  
  -- If it's a password field, mask the value
  if self.config.password then
    value = string.rep("*", #value)
  end
  
  -- If value is empty and there's a placeholder, use it
  if value == "" and self.config.placeholder ~= "" and not self.is_focused then
    value = self.config.placeholder
  end
  
  -- Determine style
  local style_name = self.config.style
  if self.is_focused then
    style_name = "focused"
  elseif self.is_disabled then
    style_name = "disabled"
  end
  
  -- Create render
  local lines = {}
  local highlights = {}
  
  -- Add label if it exists
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
    -- With border
    local top = "┌" .. string.rep("─", width) .. "┐"
    local bottom = "└" .. string.rep("─", width) .. "┘"
    
    -- Prepare content with cursor if needed
    local content = value
    if self.is_focused and self.is_editing then
      -- Insert cursor at current position
      content = string.sub(value, 1, self.cursor_pos) .. "|" .. string.sub(value, self.cursor_pos + 1)
    end
    
    -- Truncate if necessary
    content = render_utils.truncate(content, width)
    
    -- Fill with spaces
    content = content .. string.rep(" ", width - vim.fn.strdisplaywidth(content))
    
    local middle = "│" .. content .. "│"
    
    table.insert(lines, top)
    table.insert(lines, middle)
    table.insert(lines, bottom)
    
    -- Add highlights
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
    -- Without border
    -- Prepare content with cursor if needed
    local content = value
    if self.is_focused and self.is_editing then
      -- Insert cursor at current position
      content = string.sub(value, 1, self.cursor_pos) .. "|" .. string.sub(value, self.cursor_pos + 1)
    end
    
    -- Truncate if necessary
    content = render_utils.truncate(content, width)
    
    -- Fill with spaces
    content = content .. string.rep(" ", width - vim.fn.strdisplaywidth(content))
    
    local input_line = "[ " .. content .. " ]"
    
    table.insert(lines, input_line)
    
    -- Add highlights
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
    width = width + (self.config.border and 2 or 4), -- +2 for borders or +4 for [ ]
    height = #lines
  }
end

-- Method to set input field value
function Input:set_value(value, silent)
  -- Check constraints
  if self.config.max_length and #value > self.config.max_length then
    value = string.sub(value, 1, self.config.max_length)
  end
  
  -- Check if value has changed
  if self.value == value then
    return false
  end
  
  local previous_value = self.value
  self.value = value
  
  -- Adjust cursor position if needed
  if self.cursor_pos > #value then
    self.cursor_pos = #value
  end
  
  -- Validate value if validator is defined
  local is_valid = true
  if self.config.validator then
    is_valid = self.config.validator(value)
  end
  
  -- Emit change event if not silent
  if not silent then
    event_bridge.emit(schema.EVENT_TYPES.INPUT_CHANGED, {
      id = self.id,
      value = value,
      previous_value = previous_value,
      is_valid = is_valid
    })
    
    -- Call change callback if defined
    if self.on_change then
      self.on_change(value, previous_value, is_valid)
    end
  end
  
  return true
end

-- Method to start editing
function Input:start_editing()
  if self.is_disabled or self.is_editing then
    return false
  end
  
  self.is_editing = true
  self.original_value = self.value
  
  return true
end

-- Method to stop editing
function Input:stop_editing(submit)
  if not self.is_editing then
    return false
  end
  
  self.is_editing = false
  
  if submit then
    -- Emit submission event
    event_bridge.emit(schema.EVENT_TYPES.INPUT_SUBMITTED, {
      id = self.id,
      value = self.value
    })
    
    -- Call submission callback if defined
    if self.on_submit then
      self.on_submit(self.value)
    end
  else
    -- Cancel changes
    self:set_value(self.original_value, true)
    
    -- Emit cancellation event
    event_bridge.emit(schema.EVENT_TYPES.INPUT_CANCELLED, {
      id = self.id
    })
  end
  
  return true
end

-- Method to move cursor
function Input:move_cursor(position)
  if not self.is_editing then
    return false
  end
  
  -- Limit position to value bounds
  position = math.max(0, math.min(position, #self.value))
  
  if self.cursor_pos == position then
    return false
  end
  
  self.cursor_pos = position
  return true
end

-- Method to insert text at cursor position
function Input:insert_text(text)
  if not self.is_editing or self.is_disabled then
    return false
  end
  
  -- Insert text at cursor position
  local new_value = string.sub(self.value, 1, self.cursor_pos) .. text .. string.sub(self.value, self.cursor_pos + 1)
  
  -- Update value
  local success = self:set_value(new_value)
  
  -- Move cursor
  if success then
    self.cursor_pos = self.cursor_pos + #text
  end
  
  return success
end

-- Method to delete text at cursor position
function Input:delete_text(count, before_cursor)
  if not self.is_editing or self.is_disabled then
    return false
  end
  
  count = count or 1
  
  if before_cursor then
    -- Delete before cursor (backspace)
    if self.cursor_pos == 0 then
      return false
    end
    
    local delete_count = math.min(count, self.cursor_pos)
    local new_value = string.sub(self.value, 1, self.cursor_pos - delete_count) .. string.sub(self.value, self.cursor_pos + 1)
    
    -- Update value
    local success = self:set_value(new_value)
    
    -- Move cursor
    if success then
      self.cursor_pos = self.cursor_pos - delete_count
    end
    
    return success
  else
    -- Delete after cursor (delete)
    if self.cursor_pos == #self.value then
      return false
    end
    
    local delete_count = math.min(count, #self.value - self.cursor_pos)
    local new_value = string.sub(self.value, 1, self.cursor_pos) .. string.sub(self.value, self.cursor_pos + delete_count + 1)
    
    -- Update value
    return self:set_value(new_value)
  end
end

-- Method to give focus to the field
function Input:focus()
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

-- Method to remove focus from the field
function Input:blur()
  if not self.is_focused then
    return false
  end
  
  -- If in edit mode, stop editing
  if self.is_editing then
    self:stop_editing(true)
  end
  
  self.is_focused = false
  
  -- Emit focus loss event
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_BLURRED, {
    id = self.id
  })
  
  return true
end

-- Method to activate/deactivate the field
function Input:set_enabled(enabled)
  if self.is_disabled == (not enabled) then
    return false
  end
  
  self.is_disabled = not enabled
  
  -- If deactivated and in edit mode, stop editing
  if self.is_disabled and self.is_editing then
    self:stop_editing(false)
  end
  
  -- Emit update event
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_UPDATED, {
    id = self.id,
    changes = {
      enabled = enabled
    }
  })
  
  return true
end

-- Method to update field configuration
function Input:update(changes)
  if not changes then
    return false
  end
  
  -- Update properties
  if changes.value ~= nil then
    self:set_value(changes.value)
  end
  
  if changes.label ~= nil then
    self.label = changes.label
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

-- Method to submit value
function Input:submit()
  if self.is_disabled then
    return false
  end
  
  -- If in edit mode, stop editing with submission
  if self.is_editing then
    return self:stop_editing(true)
  end
  
  -- Otherwise, emit direct submission event
  event_bridge.emit(schema.EVENT_TYPES.INPUT_SUBMITTED, {
    id = self.id,
    value = self.value
  })
  
  -- Call submission callback if defined
  if self.on_submit then
    self.on_submit(self.value)
  end
  
  return true
end

-- Method to cancel editing
function Input:cancel()
  if not self.is_editing then
    return false
  end
  
  return self:stop_editing(false)
end

-- Method to destroy field
function Input:destroy()
  -- Emit destruction event
  event_bridge.emit(schema.EVENT_TYPES.COMPONENT_DESTROYED, {
    id = self.id
  })
  
  -- Remove from global registry
  event_bridge.unregister_component(self.id)
  
  return true
end

return M
