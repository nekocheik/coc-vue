--- Test utilities
-- @module test_helpers
-- @author Cheik Kone
-- @license MIT
-- @copyright Cheik Kone 2025

local validation = require('vue-ui.utils.validation')
local schema = require('vue-ui.events.schema')

local M = {}

-- Global variables for tests
local test_events = {}
local test_buffers = {}
local test_windows = {}
local test_components = {}
local test_key_inputs = {}

--- Detect if we are in a test environment
-- @return boolean True if we are in a test environment
function M.is_test_env()
  -- Check if we are in a headless or UI-less environment
  local has_ui = (vim.fn.has('nvim-0.5') == 1) and (#vim.api.nvim_list_uis() > 0)
  return not has_ui
end

--- Set up test environment
-- @param config table Optional configuration
function M.setup_test_env(config)
  config = config or {}
  
  -- Reset events
  test_events = {}
  test_buffers = {}
  test_windows = {}
  test_components = {}
  
  -- Generate unique timestamp for tests
  _G.test_timestamp = os.time()
  
  -- Store configuration
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

--- Get test events
-- @return table List of test events
function M.get_test_events()
  return test_events
end

--- Check if a specific event was emitted
-- @param event_type string Event type to search for
-- @param criteria table|nil Optional search criteria
-- @return boolean True if event was found
function M.has_event(event_type, criteria)
  validation.validate_not_empty(event_type, "Event type cannot be empty")
  criteria = criteria or {}
  
  for _, event in ipairs(test_events) do
    if event.event == event_type then
      local match = true
      
      -- Check criteria
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

--- Reset test events
function M.reset_test_events()
  test_events = {}
end

--- Simulate buffer creation
-- @param lines table Buffer lines
-- @param options table Buffer options
-- @return number Buffer ID
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

--- Simulate window creation
-- @param buffer_id number Buffer ID
-- @param options table Window options
-- @return number Window ID
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

--- Check if a buffer is valid
-- @param buffer_id number Buffer ID
-- @return boolean True if buffer is valid
function M.is_buffer_valid(buffer_id)
  return test_buffers[buffer_id] ~= nil and test_buffers[buffer_id].valid
end

--- Check if a window is valid
-- @param window_id number Window ID
-- @return boolean True if window is valid
function M.is_window_valid(window_id)
  return test_windows[window_id] ~= nil and test_windows[window_id].valid
end

--- Register a component for testing
-- @param id string Component ID
-- @param component table Component instance
function M.register_test_component(id, component)
  validation.validate_not_empty(id, "Component ID cannot be empty")
  test_components[id] = component
end

--- Get a test component
-- @param id string Component ID
-- @return table|nil Component instance or nil
function M.get_test_component(id)
  return test_components[id]
end

--- Clean up test environment
function M.cleanup_test_env()
  -- Reset events
  test_events = {}
  
  -- Close buffers and windows
  for id, _ in pairs(test_buffers) do
    test_buffers[id].valid = false
  end
  
  for id, _ in pairs(test_windows) do
    test_windows[id].valid = false
  end
  
  -- Clean up components
  test_components = {}
  
  -- Clean up global variables
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

--- Simulate keyboard input
-- @param key string Key to simulate ("<Up>", "<Down>", "<Left>", "<Right>", "<Enter>", "<Esc>", etc.)
-- @param component table Target component (optional)
-- @return boolean True if the simulation was successful
function M.simulate_key_input(key, component)
  validation.validate_not_empty(key, "Key cannot be empty")
  
  -- Add keyboard input to the list
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

--- Get simulated keyboard inputs
-- @return table List of simulated keyboard inputs
function M.get_key_inputs()
  return test_key_inputs
end

--- Reset key inputs
function M.reset_key_inputs()
  test_key_inputs = {}
end

--- Simulate key sequence
-- @param keys table List of keys to simulate
-- @param component table Target component (optional)
-- @return boolean True if all simulations were successful
function M.simulate_key_sequence(keys, component)
  validation.validate_table(keys, "Key sequence must be a table")
  
  local success = true
  for _, key in ipairs(keys) do
    local result = M.simulate_key_input(key, component)
    if not result then
      success = false
    end
  end
  
  return success
end

--- Simulate mouse click
-- @param row number Click row (0-indexed)
-- @param col number Click column (0-indexed)
-- @param button string Mouse button ("left", "right", "middle")
-- @param component table Target component (optional)
-- @return boolean True if the simulation was successful
function M.simulate_mouse_click(row, col, button, component)
  validation.validate_number(row, "Row must be a number")
  validation.validate_number(col, "Column must be a number")
  button = button or "left"
  
  -- Add mouse click to the list
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

--- Save test events to JSON file
-- @param prefix string Filename prefix
-- @return boolean True if the save was successful
function M.save_test_events(prefix)
  prefix = prefix or 'test'
  local log_path = vim.fn.stdpath('data') .. '/vue-ui-test-events_' .. prefix .. '.json'
  
  -- Convert events to JSON
  local json = vim.fn.json_encode(test_events)
  
  -- Write to file
  local file = io.open(log_path, 'w')
  if file then
    file:write(json)
    file:close()
    
    if _G.test_config and _G.test_config.debug then
      print(string.format("[TEST] Events saved to: %s", log_path))
    end
    
    return true
  end
  
  return false
end

return M
