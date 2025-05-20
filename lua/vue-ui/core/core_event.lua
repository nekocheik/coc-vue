--- Core Event Module for Vue UI Components
-- @module core_event
-- @author Cheik Kone
-- @license MIT
-- @copyright Cheik Kone 2025
--
-- This module provides event management utilities for UI components,
-- handling event emission, subscription, and data formatting.

local event_bridge = require('vue-ui.utils.event_bridge')
local schema = require('vue-ui.events.schema')

local M = {}

--- Registers a component with the event bridge
-- @param id string Component ID
-- @param component table Component instance
-- @return boolean True if registration was successful
function M.register_component(id, component)
  return event_bridge.register_component(id, component)
end

--- Unregisters a component from the event bridge
-- @param id string Component ID
-- @return boolean True if unregistration was successful
function M.unregister_component(id)
  return event_bridge.unregister_component(id)
end

--- Gets a component from the event bridge
-- @param id string Component ID
-- @return table|nil Component instance or nil if not found
function M.get_component(id)
  return event_bridge.get_component(id)
end

--- Emits a component created event
-- @param component table Component instance
-- @return boolean True if event was emitted
function M.emit_component_created(component)
  local event_data = {
    id = component.id,
    component_type = component.component_type,
    title = component.title,
    config = component.config or {}
  }
  
  return event_bridge.emit(schema.EVENT_TYPES.COMPONENT_CREATED, event_data)
end

--- Emits a component updated event
-- @param component table Component instance
-- @param changes table Changes made to the component
-- @return boolean True if event was emitted
function M.emit_component_updated(component, changes)
  local event_data = {
    id = component.id,
    changes = changes or {}
  }
  
  return event_bridge.emit(schema.EVENT_TYPES.COMPONENT_UPDATED, event_data)
end

--- Emits a component destroyed event
-- @param component table Component instance
-- @return boolean True if event was emitted
function M.emit_component_destroyed(component)
  local event_data = {
    id = component.id
  }
  
  return event_bridge.emit(schema.EVENT_TYPES.COMPONENT_DESTROYED, event_data)
end

--- Emits a component focused event
-- @param component table Component instance
-- @return boolean True if event was emitted
function M.emit_component_focused(component)
  local event_data = {
    id = component.id
  }
  
  return event_bridge.emit(schema.EVENT_TYPES.COMPONENT_FOCUSED, event_data)
end

--- Emits a component blurred event
-- @param component table Component instance
-- @return boolean True if event was emitted
function M.emit_component_blurred(component)
  local event_data = {
    id = component.id
  }
  
  return event_bridge.emit(schema.EVENT_TYPES.COMPONENT_BLURRED, event_data)
end

--- Emits a select opened event
-- @param component table Select component instance
-- @return boolean True if event was emitted
function M.emit_select_opened(component)
  local event_data = {
    id = component.id,
    config = {
      multi = component.multi,
      options = component.options
    }
  }
  
  return event_bridge.emit(schema.EVENT_TYPES.SELECT_OPENED, event_data)
end

--- Emits a select closed event
-- @param component table Select component instance
-- @return boolean True if event was emitted
function M.emit_select_closed(component)
  local event_data = {
    id = component.id
  }
  
  return event_bridge.emit(schema.EVENT_TYPES.SELECT_CLOSED, event_data)
end

--- Emits a select option focused event
-- @param component table Select component instance
-- @param option_index number Index of the focused option
-- @return boolean True if event was emitted
function M.emit_select_option_focused(component, option_index)
  local option = component.options[option_index + 1]
  if not option then
    return false
  end
  
  local event_data = {
    id = component.id,
    option_index = option_index,
    option_id = option.id,
    option_text = option.text,
    option_value = option.value
  }
  
  return event_bridge.emit(schema.EVENT_TYPES.SELECT_OPTION_FOCUSED, event_data)
end

--- Emits a select option selected event
-- @param component table Select component instance
-- @param option_index number Index of the selected option
-- @return boolean True if event was emitted
function M.emit_select_option_selected(component, option_index)
  local option = component.options[option_index + 1]
  if not option then
    return false
  end
  
  local event_data = {
    id = component.id,
    option_index = option_index,
    option_id = option.id,
    option_text = option.text,
    option_value = option.value,
    multi = component.multi
  }
  
  return event_bridge.emit(schema.EVENT_TYPES.SELECT_OPTION_SELECTED, event_data)
end

--- Emits a select option deselected event
-- @param component table Select component instance
-- @param option_index number Index of the deselected option
-- @param option table Option that was deselected
-- @return boolean True if event was emitted
function M.emit_select_option_deselected(component, option_index, option)
  if not option then
    option = component.options[option_index + 1]
    if not option then
      return false
    end
  end
  
  local event_data = {
    id = component.id,
    option_index = option_index,
    option_id = option.id,
    option_text = option.text,
    option_value = option.value,
    multi = component.multi
  }
  
  return event_bridge.emit(schema.EVENT_TYPES.SELECT_OPTION_DESELECTED, event_data)
end

--- Emits a select confirmed event
-- @param component table Select component instance
-- @return boolean True if event was emitted
function M.emit_select_confirmed(component)
  local value = ""
  
  if component.multi then
    -- Multi-select mode
    -- Build a string with the selected values
    local values = {}
    for _, selected_option in ipairs(component.selected_options) do
      table.insert(values, selected_option.value)
    end
    value = table.concat(values, ",")
  else
    -- Single-select mode
    if component.selected_option_index ~= nil and component.selected_option_index >= 0 and component.selected_option_index < #component.options then
      value = component.selected_value
    end
  end
  
  local event_data = {
    id = component.id,
    value = value,
    is_multi = component.multi
  }
  
  if component.multi then
    -- Multi-select mode
    local selected_values = {}
    local selected_texts = {}
    local selected_ids = {}
    
    for _, option in ipairs(component.selected_options) do
      table.insert(selected_values, option.value)
      table.insert(selected_texts, option.text)
      table.insert(selected_ids, option.id)
    end
    
    event_data.selected_values = selected_values
    event_data.selected_texts = selected_texts
    event_data.selected_ids = selected_ids
    event_data.selected_count = #component.selected_options
    event_data.selected_options = component.selected_options
  else
    -- Single-select mode
    event_data.selected_value = component.selected_value
    event_data.selected_text = component.selected_text
    event_data.selected_index = component.selected_option_index
  end
  
  return event_bridge.emit(schema.EVENT_TYPES.SELECT_CONFIRMED, event_data)
end

--- Emits a select cancelled event
-- @param component table Select component instance
-- @param reason string|nil Reason for cancellation
-- @return boolean True if event was emitted
function M.emit_select_cancelled(component, reason)
  local event_data = {
    id = component.id,
    reason = reason or "user_cancelled"
  }
  
  return event_bridge.emit(schema.EVENT_TYPES.SELECT_CANCELLED, event_data)
end

--- Emits a select options updated event
-- @param component table Select component instance
-- @return boolean True if event was emitted
function M.emit_select_options_updated(component)
  local event_data = {
    id = component.id,
    options = component.options,
    option_count = #component.options
  }
  
  return event_bridge.emit(schema.EVENT_TYPES.SELECT_OPTIONS_UPDATED, event_data)
end

--- Emits a select changed event
-- @param component table Select component instance
-- @param previous_value any Previous value before the change
-- @return boolean True if event was emitted
function M.emit_select_changed(component, previous_value)
  -- Get the current focused option
  local index = component.focused_option_index
  if index < 0 or index >= #component.options then
    return false
  end
  
  local option = component.options[index + 1]
  if not option then
    return false
  end
  
  local event_data = {
    id = component.id,
    value = option.value,
    previous_value = previous_value,
    option = option,
    option_id = option.id,
    option_index = index,
    is_multi = component.multi
  }
  
  if component.multi then
    event_data.selected_options = component.selected_options
  end
  
  return event_bridge.emit(schema.EVENT_TYPES.SELECT_CHANGED, event_data)
end

return M
