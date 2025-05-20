--- Core Options Module for Vue UI Components
-- @module core_options
-- @author Cheik Kone
-- @license MIT
-- @copyright Cheik Kone 2025
--
-- This module provides option management utilities for UI components,
-- handling option validation, normalization, and manipulation.

local validation = require('vue-ui.core.core_validation')

local M = {}

--- Validates and normalizes options
-- @param options table|nil Options to validate
-- @return table Validated and normalized options
function M.validate_options(options)
  return validation.validate_options(options)
end

--- Finds an option by index
-- @param options table Options array
-- @param index number Option index
-- @return table|nil Option at the specified index, or nil if not found
function M.find_option_by_index(options, index)
  if index < 0 or index >= #options then
    return nil
  end
  
  return options[index + 1]
end

--- Finds an option by ID
-- @param options table Options array
-- @param id string Option ID
-- @return table|nil Option with the specified ID, or nil if not found
-- @return number|nil Index of the option, or nil if not found
function M.find_option_by_id(options, id)
  for i, option in ipairs(options) do
    if option.id == id then
      return option, i - 1
    end
  end
  
  return nil, nil
end

--- Finds an option by value
-- @param options table Options array
-- @param value any Option value
-- @return table|nil Option with the specified value, or nil if not found
-- @return number|nil Index of the option, or nil if not found
function M.find_option_by_value(options, value)
  for i, option in ipairs(options) do
    if option.value == value then
      return option, i - 1
    end
  end
  
  return nil, nil
end

--- Adds an option to the options array
-- @param options table Options array
-- @param option table|string Option to add
-- @return table Updated options array
-- @return number Index of the added option
function M.add_option(options, option)
  local new_option
  
  if type(option) ~= 'table' then
    new_option = {
      id = tostring(#options + 1),
      text = tostring(option),
      value = tostring(option)
    }
  else
    new_option = option
    
    if not new_option.id then
      new_option.id = tostring(#options + 1)
    end
    
    if not new_option.text then
      new_option.text = new_option.id
    end
    
    if not new_option.value then
      new_option.value = new_option.id
    end
  end
  
  table.insert(options, new_option)
  
  return options, #options - 1
end

--- Removes an option by index
-- @param options table Options array
-- @param index number Option index
-- @return table Updated options array
-- @return boolean True if the option was removed, false otherwise
function M.remove_option_by_index(options, index)
  if index < 0 or index >= #options then
    return options, false
  end
  
  table.remove(options, index + 1)
  
  return options, true
end

--- Removes an option by ID
-- @param options table Options array
-- @param id string Option ID
-- @return table Updated options array
-- @return boolean True if the option was removed, false otherwise
function M.remove_option_by_id(options, id)
  for i, option in ipairs(options) do
    if option.id == id then
      table.remove(options, i)
      return options, true
    end
  end
  
  return options, false
end

--- Removes an option by value
-- @param options table Options array
-- @param value any Option value
-- @return table Updated options array
-- @return boolean True if the option was removed, false otherwise
function M.remove_option_by_value(options, value)
  for i, option in ipairs(options) do
    if option.value == value then
      table.remove(options, i)
      return options, true
    end
  end
  
  return options, false
end

--- Updates an option by index
-- @param options table Options array
-- @param index number Option index
-- @param updates table Updates to apply
-- @return table Updated options array
-- @return boolean True if the option was updated, false otherwise
function M.update_option_by_index(options, index, updates)
  if index < 0 or index >= #options then
    return options, false
  end
  
  local option = options[index + 1]
  
  for k, v in pairs(updates) do
    option[k] = v
  end
  
  return options, true
end

--- Updates an option by ID
-- @param options table Options array
-- @param id string Option ID
-- @param updates table Updates to apply
-- @return table Updated options array
-- @return boolean True if the option was updated, false otherwise
function M.update_option_by_id(options, id, updates)
  for i, option in ipairs(options) do
    if option.id == id then
      for k, v in pairs(updates) do
        option[k] = v
      end
      
      return options, true
    end
  end
  
  return options, false
end

--- Updates an option by value
-- @param options table Options array
-- @param value any Option value
-- @param updates table Updates to apply
-- @return table Updated options array
-- @return boolean True if the option was updated, false otherwise
function M.update_option_by_value(options, value, updates)
  for i, option in ipairs(options) do
    if option.value == value then
      for k, v in pairs(updates) do
        option[k] = v
      end
      
      return options, true
    end
  end
  
  return options, false
end

--- Clears all options
-- @param options table Options array
-- @return table Empty options array
function M.clear_options(options)
  return {}
end

--- Filters options by a predicate function
-- @param options table Options array
-- @param predicate function Function that takes an option and returns true to include it
-- @return table Filtered options array
function M.filter_options(options, predicate)
  local filtered = {}
  
  for i, option in ipairs(options) do
    if predicate(option, i - 1) then
      table.insert(filtered, option)
    end
  end
  
  return filtered
end

--- Maps options using a mapping function
-- @param options table Options array
-- @param mapper function Function that takes an option and returns a new option
-- @return table Mapped options array
function M.map_options(options, mapper)
  local mapped = {}
  
  for i, option in ipairs(options) do
    table.insert(mapped, mapper(option, i - 1))
  end
  
  return mapped
end

--- Sorts options using a comparator function
-- @param options table Options array
-- @param comparator function Function that takes two options and returns true if the first should come before the second
-- @return table Sorted options array
function M.sort_options(options, comparator)
  local sorted = {}
  
  for i, option in ipairs(options) do
    sorted[i] = option
  end
  
  table.sort(sorted, comparator)
  
  return sorted
end

--- Creates a default option
-- @param index number Option index
-- @param text string Option text
-- @param value any Option value
-- @return table Option object
function M.create_option(index, text, value)
  return {
    id = tostring(index),
    text = text or tostring(index),
    value = value or text or tostring(index)
  }
end

--- Updates the options of a component
-- @param options table New options for the component
-- @param component table Component instance (for multi-select handling)
-- @return table Validated and normalized options
-- @return boolean True if the options were updated successfully
function M.update_options(options, component)
  if not options or type(options) ~= "table" then
    return {}, false
  end
  
  -- Validate and normalize the options
  local normalized_options = {}
  for i, option in ipairs(options) do
    if type(option) ~= 'table' then
      normalized_options[i] = { id = tostring(i), text = tostring(option), value = tostring(option) }
    else
      normalized_options[i] = option
      if not option.id then
        normalized_options[i].id = tostring(i)
      end
      
      if not option.text then
        normalized_options[i].text = normalized_options[i].id
      end
      
      if not option.value then
        normalized_options[i].value = normalized_options[i].id
      end
    end
  end
  
  -- If component is provided, handle multi-select mode
  if component then
    if component.multi then
      -- Multi-select mode: filter out selected options that no longer exist
      local valid_selected_options = {}
      for _, selected_option in ipairs(component.selected_options) do
        local still_exists = false
        for i, option in ipairs(normalized_options) do
          if option.id == selected_option.id then
            -- Update the index
            selected_option.index = i - 1
            still_exists = true
            break
          end
        end
        if still_exists then
          table.insert(valid_selected_options, selected_option)
        end
      end
      component.selected_options = valid_selected_options
    else
      -- Single-select mode: reset the selection if the selected option no longer exists
      if component.selected_option_index ~= nil and component.selected_option_index >= #normalized_options then
        component.selected_option_index = -1
        component.selected_value = nil
        component.selected_text = nil
      end
    end
  end
  
  return normalized_options, true
end

return M
