--- Core State Management Module for Vue UI Components
-- @module core_state
-- @author Cheik Kone
-- @license MIT
-- @copyright Cheik Kone 2025
--
-- This module provides state management utilities for UI components,
-- handling open/closed states, selection states, focus management,
-- and other stateful operations.

local M = {}

--- Checks if a component can be opened
-- @param component table Component instance
-- @return boolean True if the component can be opened
function M.can_open(component)
  return not component.is_open and not component.disabled
end

--- Checks if a component can be closed
-- @param component table Component instance
-- @return boolean True if the component can be closed
function M.can_close(component)
  return component._is_open
end

--- Checks if an option can be focused in a component
-- @param component table Component instance
-- @param index number Index of the option to focus
-- @return boolean True if the option can be focused
function M.can_focus_option(component, index)
  -- Check if the component is open and has options
  if not component._is_open or #component.options == 0 then
    return false
  end
  
  -- Check if the index is valid
  if index < 0 or index >= #component.options then
    return false
  end
  
  return true
end

--- Checks if an option can be selected in a component
-- @param component table Component instance
-- @param index number Index of the option to select
-- @return boolean True if the option can be selected
function M.can_select_option(component, index)
  -- Check if the component is open and has options
  if not component._is_open or #component.options == 0 then
    return false
  end
  
  -- Check if the index is valid
  if index < 0 or index >= #component.options then
    return false
  end
  
  return true
end

--- Checks if the current focused option can be selected
-- @param component table Component instance
-- @return boolean True if the current option can be selected
function M.can_select_current_option(component)
  -- Check if the component is open
  if not component._is_open then
    return false
  end
  
  -- Check if there's a valid focused option
  if component.focused_option_index < 0 or component.focused_option_index >= #component.options then
    return false
  end
  
  -- Check if the option exists
  local option = component.options[component.focused_option_index + 1]
  if not option then
    return false
  end
  
  return true
end

--- Checks if an option can be selected by value
-- @param component table Component instance
-- @param value string Value to select
-- @return boolean True if the option can be selected by value
function M.can_select_by_value(component, value)
  -- Check if the value is valid
  if not value then
    return false
  end
  
  -- Check if the option with the specified value exists
  for _, option in ipairs(component.options) do
    if option.value == value then
      return true
    end
  end
  
  return false
end

--- Checks if a component can be confirmed
-- @param component table Component instance
-- @return boolean True if the component can be confirmed
function M.can_confirm(component)
  -- Check if the component is open
  if not component._is_open then
    return false
  end
  
  return true
end

--- Checks if a component can be cancelled
-- @param component table Component instance
-- @return boolean True if the component can be cancelled
function M.can_cancel(component)
  -- Check if the component is open
  if not component._is_open then
    return false
  end
  
  return true
end

--- Checks if an option can be focused
-- @param component table Component instance
-- @param index number Option index
-- @return boolean True if the option can be focused
function M.can_focus_option(component, index)
  if not component._is_open or #component.options == 0 then
    return false
  end
  
  -- Check if the index is valid
  if index < 0 or index >= #component.options then
    return false
  end
  
  return true
end

--- Checks if an option can be selected
-- @param component table Component instance
-- @return boolean True if an option can be selected
function M.can_select_option(component)
  if not component._is_open or component.focused_option_index < 0 or component.focused_option_index >= #component.options then
    return false
  end
  
  return true
end

--- Checks if a component can confirm selection
-- @param component table Component instance
-- @return boolean True if the component can confirm selection
function M.can_confirm(component)
  if not component._is_open then
    return false
  end
  
  return true
end

--- Checks if a component can cancel selection
-- @param component table Component instance
-- @return boolean True if the component can cancel selection
function M.can_cancel(component)
  if not component._is_open then
    return false
  end
  
  return true
end

--- Creates a new state manager for a component
-- @param initial_state table Initial state values
-- @return table State manager instance
function M.create_state_manager(initial_state)
  local state = initial_state or {}
  
  local manager = {
    -- Get a state value
    get = function(key)
      return state[key]
    end,
    
    -- Set a state value
    set = function(key, value)
      local old_value = state[key]
      state[key] = value
      return old_value ~= value, old_value, value
    end,
    
    -- Toggle a boolean state value
    toggle = function(key)
      if type(state[key]) ~= "boolean" then
        state[key] = true
        return true, nil, true
      end
      
      state[key] = not state[key]
      return true, not state[key], state[key]
    end,
    
    -- Get the entire state
    get_all = function()
      return state
    end,
    
    -- Update multiple state values
    update = function(updates)
      local changed = false
      local changes = {}
      
      for k, v in pairs(updates) do
        local old_value = state[k]
        if old_value ~= v then
          state[k] = v
          changed = true
          changes[k] = {old = old_value, new = v}
        end
      end
      
      return changed, changes
    end
  }
  
  return manager
end

--- Creates a selection state manager for selectable components
-- @param options table Options configuration
-- @param is_multi boolean Whether multi-selection is enabled
-- @return table Selection state manager
function M.create_selection_manager(options, is_multi)
  local selected_option_index = nil
  local selected_value = nil
  local selected_text = nil
  local selected_options = {}
  
  local manager = {
    -- Get the currently selected option index (single-select)
    get_selected_index = function()
      return selected_option_index
    end,
    
    -- Get the currently selected value (single-select)
    get_selected_value = function()
      return selected_value
    end,
    
    -- Get the currently selected text (single-select)
    get_selected_text = function()
      return selected_text
    end,
    
    -- Get all selected options (multi-select)
    get_selected_options = function()
      return selected_options
    end,
    
    -- Check if an option is selected
    is_option_selected = function(index)
      if not is_multi then
        -- Single-select mode
        return index == selected_option_index
      else
        -- Multi-select mode
        for _, selected_option in ipairs(selected_options) do
          if selected_option.index == index then
            return true
          end
        end
        return false
      end
    end,
    
    -- Select an option by index
    select_by_index = function(index)
      if index < 0 or index >= #options then
        return false
      end
      
      if is_multi then
        -- Multi-select mode
        if manager.is_option_selected(index) then
          return true
        end
        
        local option = options[index + 1]
        table.insert(selected_options, {
          id = option.id,
          text = option.text,
          value = option.value,
          index = index
        })
        
        return true
      else
        -- Single-select mode
        if selected_option_index == index then
          return false
        end
        
        selected_option_index = index
        local option = options[index + 1]
        selected_value = option.value
        selected_text = option.text
        
        return true
      end
    end,
    
    -- Deselect an option by index
    deselect_by_index = function(index)
      if not is_multi then
        if selected_option_index == index then
          selected_option_index = nil
          selected_value = nil
          selected_text = nil
          return true
        end
        return false
      else
        -- Find the option in the list of selected options
        for i, selected_option in ipairs(selected_options) do
          if selected_option.index == index then
            table.remove(selected_options, i)
            return true
          end
        end
        return false
      end
    end,
    
    -- Select an option by value
    select_by_value = function(value)
      if not value then
        return false
      end
      
      for i, option in ipairs(options) do
        if option.value == value then
          return manager.select_by_index(i - 1)
        end
      end
      
      return false
    end,
    
    -- Deselect an option by value
    deselect_by_value = function(value)
      if not value then
        return false
      end
      
      for i, option in ipairs(options) do
        if option.value == value then
          return manager.deselect_by_index(i - 1)
        end
      end
      
      return false
    end,
    
    -- Clear all selections
    clear_selection = function()
      if is_multi then
        if #selected_options == 0 then
          return false
        end
        selected_options = {}
      else
        if selected_option_index == nil then
          return false
        end
        selected_option_index = nil
        selected_value = nil
        selected_text = nil
      end
      
      return true
    end,
    
    -- Update the options
    update_options = function(new_options)
      options = new_options
      
      -- Reset selections
      if is_multi then
        selected_options = {}
      else
        selected_option_index = nil
        selected_value = nil
        selected_text = nil
      end
      
      return true
    end,
    
    -- Get all options
    get_options = function()
      return options
    end,
    
    -- Get option count
    get_option_count = function()
      return #options
    end,
    
    -- Get option by index
    get_option = function(index)
      if index < 0 or index >= #options then
        return nil
      end
      return options[index + 1]
    end
  }
  
  return manager
end

--- Creates a focus state manager for focusable components
-- @param item_count number Number of focusable items
-- @param initial_focus number|nil Initial focus index
-- @return table Focus state manager
function M.create_focus_manager(item_count, initial_focus)
  local focused_index = initial_focus or -1
  
  local manager = {
    -- Get the currently focused index
    get_focused_index = function()
      return focused_index
    end,
    
    -- Set the focused index
    set_focus = function(index)
      if index < -1 or index >= item_count then
        return false
      end
      
      if focused_index == index then
        return false
      end
      
      focused_index = index
      return true
    end,
    
    -- Focus the next item
    focus_next = function()
      local next_index = (focused_index + 1) % item_count
      return manager.set_focus(next_index)
    end,
    
    -- Focus the previous item
    focus_prev = function()
      local prev_index = (focused_index - 1 + item_count) % item_count
      return manager.set_focus(prev_index)
    end,
    
    -- Focus the first item
    focus_first = function()
      if item_count == 0 then
        return false
      end
      
      return manager.set_focus(0)
    end,
    
    -- Focus the last item
    focus_last = function()
      if item_count == 0 then
        return false
      end
      
      return manager.set_focus(item_count - 1)
    end,
    
    -- Clear focus
    clear_focus = function()
      if focused_index == -1 then
        return false
      end
      
      focused_index = -1
      return true
    end,
    
    -- Check if an item is focused
    is_focused = function(index)
      return focused_index == index
    end,
    
    -- Update the item count
    update_item_count = function(new_count)
      item_count = new_count
      
      -- Adjust focus if needed
      if focused_index >= item_count then
        focused_index = item_count > 0 and item_count - 1 or -1
        return true
      end
      
      return false
    end
  }
  
  return manager
end

return M
