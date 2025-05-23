-- vue-ui/utils/window_manager.lua
-- Window layout manager for coc-vue

local M = {}

-- Store window IDs for different slots
M.windows = {
  ['left'] = nil,
  ['center-top'] = nil,
  ['center-bottom'] = nil,
  ['right'] = nil,
  ['bar-top'] = nil,
  ['bar-bottom'] = nil
}

-- Store buffer IDs for different slots
M.buffers = {}

-- Store sizes for different slots
M.sizes = {
  ['left'] = 25,         -- Left panel width (narrower for better center view)
  ['center-top'] = 70,    -- Center-top panel height (larger for main editor)
  ['center-bottom'] = 15, -- Center-bottom panel height (enough for console output)
  ['right'] = 30,         -- Right panel width (for properties panel)
  ['bar-top'] = 1,        -- Top bar height (slimmer for menu bar)
  ['bar-bottom'] = 1      -- Bottom bar height (slimmer for status bar)
}

-- Logger function to help with debugging
local function log_info(message)
  vim.api.nvim_out_write("[window_manager] INFO: " .. message .. "\n")
end

local function log_error(message)
  vim.api.nvim_err_writeln("[window_manager] ERROR: " .. message)
end

-- Check if a window ID is valid
local function is_window_valid(win_id)
  if not win_id then return false end
  local status, valid = pcall(vim.api.nvim_win_is_valid, win_id)
  return status and valid
end

-- Check if a buffer ID is valid
local function is_buffer_valid(buf_id)
  if not buf_id then return false end
  local status, valid = pcall(vim.api.nvim_buf_is_valid, buf_id)
  return status and valid
end

-- Create a fresh window and return the window ID
local function create_fresh_window(slot, buffer_id, position, size)
  -- Validate the buffer ID first
  if not is_buffer_valid(buffer_id) then
    log_error(string.format("Cannot create window for slot '%s' - Invalid buffer ID: %s", slot, tostring(buffer_id)))
    return nil
  end
  
  log_info(string.format("Creating fresh window for slot '%s' with buffer %s", slot, tostring(buffer_id)))
  
  local cmd = ''
  if position == 'top' then
    cmd = string.format('topleft %dsplit', size)
  elseif position == 'bottom' then
    cmd = string.format('botright %dsplit', size)
  elseif position == 'left' then
    cmd = string.format('vertical topleft %dsplit', size)
  elseif position == 'right' then
    cmd = string.format('vertical botright %dsplit', size)
  else
    -- Default to full window if position is not recognized
    cmd = 'new'
  end
  
  -- Create the window
  local status, err = pcall(function()
    vim.cmd(cmd)
  end)
  
  if not status then
    log_error(string.format("Failed to create window for slot '%s': %s", slot, tostring(err)))
    return nil
  end
  
  -- Get the new window ID
  local win_id = vim.api.nvim_get_current_win()
  log_info(string.format("Created new window with ID %s for slot '%s'", tostring(win_id), slot))
  
  -- Set the buffer in the window
  status, err = pcall(function()
    vim.api.nvim_win_set_buf(win_id, buffer_id)
  end)
  
  if not status then
    log_error(string.format("Failed to set buffer for window %s: %s", tostring(win_id), tostring(err)))
    return nil
  end
  
  log_info(string.format("Successfully set buffer %s in window %s for slot '%s'", 
              tostring(buffer_id), tostring(win_id), slot))
  
  -- Set window options
  pcall(function()
    vim.api.nvim_win_set_option(win_id, 'number', false)
    vim.api.nvim_win_set_option(win_id, 'relativenumber', false)
    vim.api.nvim_win_set_option(win_id, 'wrap', false)
  end)
  
  -- Store the window and buffer IDs
  M.windows[slot] = win_id
  M.buffers[slot] = buffer_id
  
  return win_id
end

-- Validate all provided buffers and return only the valid ones
function M.validate_buffers(buffers)
  log_info("Validating buffers before layout creation")
  
  local valid_buffers = {}
  local invalid_slots = {}
  
  for slot, buffer_id in pairs(buffers) do
    if is_buffer_valid(buffer_id) then
      valid_buffers[slot] = buffer_id
      log_info(string.format("Validated buffer %s for slot '%s'", tostring(buffer_id), slot))
    else
      table.insert(invalid_slots, slot)
      log_error(string.format("Invalid buffer ID for slot '%s': %s", slot, tostring(buffer_id)))
    end
  end
  
  if #invalid_slots > 0 then
    log_error("Some slots have invalid buffers: " .. table.concat(invalid_slots, ", "))
  end
  
  return valid_buffers, invalid_slots
end

-- Reset layout state - clear all window and buffer references
function M.reset_layout_state()
  log_info("Resetting layout state - clearing all window and buffer references")
  
  for slot, _ in pairs(M.windows) do
    M.windows[slot] = nil
  end
  
  for slot, _ in pairs(M.buffers) do
    M.buffers[slot] = nil
  end
end

-- Create the entire layout from scratch
function M.create_layout(buffers)
  log_info("Starting layout creation with fresh windows")
  
  -- Reset the state first
  M.reset_layout_state()
  
  -- Validate buffer IDs
  local valid_buffers, _ = M.validate_buffers(buffers)
  
  if next(valid_buffers) == nil then
    log_error("No valid buffers found. Cannot create layout.")
    return false
  end
  
  -- Create a new tab for a clean slate
  local status, err = pcall(function()
    -- Create a new tab and make it the only one
    vim.cmd('tabnew')
    vim.cmd('tabonly')
    
    -- Clear all windows in the tab
    vim.cmd('only')
  end)
  
  if not status then
    log_error("Failed to create new tab: " .. tostring(err))
    return false
  end
  
  log_info("Created clean tab for layout")
  
  -- Track the main window for final focus
  local main_window = nil
  
  -- Step 1: Create top bar (if it exists)
  if valid_buffers['bar-top'] then
    local win_id = create_fresh_window('bar-top', valid_buffers['bar-top'], 'top', M.sizes['bar-top'])
    if win_id then
      log_info("Created top bar window: " .. tostring(win_id))
      pcall(function()
        vim.api.nvim_win_set_option(win_id, 'winhighlight', 'Normal:PmenuSel')
      end)
    end
  end
  
  -- Step 2: Create left panel
  if valid_buffers['left'] then
    local win_id = create_fresh_window('left', valid_buffers['left'], 'left', M.sizes['left'])
    if win_id then
      log_info("Created left panel window: " .. tostring(win_id))
    end
  end
  
  -- Step 3: Create center-top panel (in the main window)
  -- Move to what should be the main window area
  local status, err = pcall(function()
    vim.cmd('wincmd l')
  end)
  
  if not status then
    log_error("Failed to navigate to main window area: " .. tostring(err))
  end
  
  if valid_buffers['center-top'] then
    local current_win = vim.api.nvim_get_current_win()
    
    -- Set the buffer in the current window
    status, err = pcall(function()
      vim.api.nvim_win_set_buf(current_win, valid_buffers['center-top'])
    end)
    
    if status then
      log_info(string.format("Set buffer %s in main window %s for center-top", 
        tostring(valid_buffers['center-top']), tostring(current_win)))
      
      M.windows['center-top'] = current_win
      M.buffers['center-top'] = valid_buffers['center-top']
      main_window = current_win
      
      -- Set window options
      pcall(function()
        vim.api.nvim_win_set_option(current_win, 'number', false)
        vim.api.nvim_win_set_option(current_win, 'relativenumber', false)
        vim.api.nvim_win_set_option(current_win, 'wrap', false)
      end)
    else
      log_error(string.format("Failed to set buffer for center-top: %s", tostring(err)))
    end
  end
  
  -- Step 4: Create center-bottom panel
  if valid_buffers['center-bottom'] then
    local win_id = create_fresh_window('center-bottom', valid_buffers['center-bottom'], 'bottom', M.sizes['center-bottom'])
    if win_id then
      log_info("Created center-bottom panel window: " .. tostring(win_id))
      
      -- Try to navigate back to center-top
      pcall(function()
        vim.cmd('wincmd k')
      end)
    end
  end
  
  -- Step 5: Create right panel
  if valid_buffers['right'] then
    local win_id = create_fresh_window('right', valid_buffers['right'], 'right', M.sizes['right'])
    if win_id then
      log_info("Created right panel window: " .. tostring(win_id))
      
      -- Try to navigate back to center
      pcall(function()
        vim.cmd('wincmd h')
      end)
    end
  end
  
  -- Step 6: Create bottom bar (if it exists)
  -- Try to navigate to the bottom window
  pcall(function()
    vim.cmd('wincmd j')
  end)
  
  if valid_buffers['bar-bottom'] then
    local win_id = create_fresh_window('bar-bottom', valid_buffers['bar-bottom'], 'bottom', M.sizes['bar-bottom'])
    if win_id then
      log_info("Created bottom bar window: " .. tostring(win_id))
      pcall(function()
        vim.api.nvim_win_set_option(win_id, 'winhighlight', 'Normal:PmenuSel')
      end)
    end
  end
  
  -- Step 7: Set focus to the main window (center-top) if it exists
  if is_window_valid(main_window) then
    status, err = pcall(function()
      vim.api.nvim_set_current_win(main_window)
    end)
    
    if status then
      log_info("Set focus to main window: " .. tostring(main_window))
    else
      log_error("Failed to set focus to main window: " .. tostring(err))
    end
  else
    log_info("No valid main window found, leaving focus as is")
  end
  
  -- Validate final windows
  local valid_windows = 0
  local window_info = {}
  
  for slot, win_id in pairs(M.windows) do
    if is_window_valid(win_id) then
      valid_windows = valid_windows + 1
      table.insert(window_info, string.format("%s: %s", slot, tostring(win_id)))
    else
      log_error(string.format("Final window check: Window for slot '%s' is invalid: %s", slot, tostring(win_id)))
    end
  end
  
  log_info(string.format("Layout creation completed with %d valid windows: %s", 
    valid_windows, table.concat(window_info, ", ")))
  
  return true
end

-- Update a window's size with proper validation
function M.resize_window(slot, size)
  log_info(string.format("Attempting to resize window for slot '%s' to size %d", slot, size))
  
  -- Check if slot exists
  local win_id = M.windows[slot]
  if not win_id then
    log_error(string.format("Cannot resize window - No window ID found for slot '%s'", slot))
    return false
  end
  
  -- Validate window ID
  if not is_window_valid(win_id) then
    log_error(string.format("Cannot resize window - Window ID %s for slot '%s' is invalid", tostring(win_id), slot))
    return false
  end
  
  -- Update size in our cache
  M.sizes[slot] = size
  log_info(string.format("Updated size for slot '%s' to %d", slot, size))
  
  -- Save current window
  local status, current_win = pcall(vim.api.nvim_get_current_win)
  if not status then
    log_error("Failed to get current window")
    current_win = nil
  end
  
  -- Try to focus the window to resize
  status, err = pcall(function()
    vim.api.nvim_set_current_win(win_id)
  end)
  
  if not status then
    log_error(string.format("Failed to focus window %s for resizing: %s", tostring(win_id), tostring(err)))
    return false
  end
  
  -- Resize based on the slot type
  status, err = pcall(function()
    if slot == 'left' or slot == 'right' then
      vim.cmd('vertical resize ' .. size)
    else
      vim.cmd('resize ' .. size)
    end
  end)
  
  if not status then
    log_error(string.format("Failed to resize window %s: %s", tostring(win_id), tostring(err)))
  else
    log_info(string.format("Successfully resized window %s for slot '%s' to size %d", tostring(win_id), slot, size))
  end
  
  -- Restore focus to original window if possible
  if current_win and is_window_valid(current_win) then
    pcall(function()
      vim.api.nvim_set_current_win(current_win)
    end)
  end
  
  return status
end

-- Close all windows and reset state
function M.close_layout()
  log_info("Closing current layout")
  
  -- Try to close tab without throwing errors
  local tab_closed = pcall(function()
    vim.cmd('tabclose')
  end)
  
  if not tab_closed then
    log_info("Failed to close tab, may not exist or is the last tab")
    
    -- Try an alternative approach - close all windows except one
    pcall(function()
      vim.cmd('only')
    end)
    
    log_info("Used 'only' command as fallback")
  end
  
  -- Clear all window and buffer references
  M.reset_layout_state()
  log_info("Layout closed and state reset")
  
  return true
end

-- Mount a buffer in a specific slot with validation
function M.mount_buffer(slot, buffer_id)
  log_info(string.format("Attempting to mount buffer %s in slot '%s'", tostring(buffer_id), slot))
  
  -- Check if slot exists in our tracking
  if not M.windows[slot] then
    log_error(string.format("Cannot mount buffer - No window registered for slot '%s'", slot))
    return false
  end
  
  local win_id = M.windows[slot]
  
  -- Validate window ID
  if not is_window_valid(win_id) then
    log_error(string.format("Cannot mount buffer - Window %s for slot '%s' is invalid", tostring(win_id), slot))
    return false
  end
  
  -- Validate buffer ID
  if not is_buffer_valid(buffer_id) then
    log_error(string.format("Cannot mount buffer - Buffer %s is invalid", tostring(buffer_id)))
    return false
  end
  
  -- Set the buffer in the window
  local status, err = pcall(function()
    vim.api.nvim_win_set_buf(win_id, buffer_id)
  end)
  
  if not status then
    log_error(string.format("Failed to set buffer %s in window %s: %s", 
      tostring(buffer_id), tostring(win_id), tostring(err)))
    return false
  end
  
  -- Update buffer tracking
  M.buffers[slot] = buffer_id
  log_info(string.format("Successfully mounted buffer %s in window %s for slot '%s'", 
    tostring(buffer_id), tostring(win_id), slot))
  
  return true
end

-- Setup demo static content for bar areas with robust validation
function M.setup_bar_content(bar_top_buffer, bar_bottom_buffer)
  log_info(string.format("Setting up bar content for buffers - Top: %s, Bottom: %s", 
    tostring(bar_top_buffer), tostring(bar_bottom_buffer)))
  
  local success = true
  
  -- Process top bar if provided
  if bar_top_buffer then
    if is_buffer_valid(bar_top_buffer) then
      local status, err = pcall(function()
        vim.api.nvim_buf_set_option(bar_top_buffer, 'modifiable', true)
        vim.api.nvim_buf_set_lines(bar_top_buffer, 0, -1, false, {
          "====== COC-VUE TABS DEMO " .. string.rep("=", 50),
          "[Home] [Components] [Settings] [Help]" .. string.rep(" ", 30) .. "WindowManager Demo"
        })
        vim.api.nvim_buf_set_option(bar_top_buffer, 'modifiable', false)
      end)
      
      if status then
        log_info(string.format("Successfully set content for top bar buffer %s", tostring(bar_top_buffer)))
      else
        log_error(string.format("Failed to set content for top bar buffer: %s", tostring(err)))
        success = false
      end
    else
      log_error(string.format("Cannot set content - Top bar buffer %s is invalid", tostring(bar_top_buffer)))
      success = false
    end
  end
  
  -- Process bottom bar if provided
  if bar_bottom_buffer then
    if is_buffer_valid(bar_bottom_buffer) then
      local status, err = pcall(function()
        vim.api.nvim_buf_set_option(bar_bottom_buffer, 'modifiable', true)
        vim.api.nvim_buf_set_lines(bar_bottom_buffer, 0, -1, false, {
          "Status: Ready" .. string.rep(" ", 20) .. "Layout: Default" .. string.rep(" ", 20) .. "Mode: Normal",
          "====== COC-VUE STATUS DEMO " .. string.rep("=", 50)
        })
        vim.api.nvim_buf_set_option(bar_bottom_buffer, 'modifiable', false)
      end)
      
      if status then
        log_info(string.format("Successfully set content for bottom bar buffer %s", tostring(bar_bottom_buffer)))
      else
        log_error(string.format("Failed to set content for bottom bar buffer: %s", tostring(err)))
        success = false
      end
    else
      log_error(string.format("Cannot set content - Bottom bar buffer %s is invalid", tostring(bar_bottom_buffer)))
      success = false
    end
  end
  
  return success
end

-- Get debug information about the current layout
function M.get_layout_info()
  local info = {
    windows = {},
    buffers = {},
    valid_windows = 0,
    valid_buffers = 0
  }
  
  -- Check window validity
  for slot, win_id in pairs(M.windows) do
    local valid = is_window_valid(win_id)
    info.windows[slot] = {
      id = win_id,
      valid = valid
    }
    
    if valid then
      info.valid_windows = info.valid_windows + 1
    end
  end
  
  -- Check buffer validity
  for slot, buf_id in pairs(M.buffers) do
    local valid = is_buffer_valid(buf_id)
    info.buffers[slot] = {
      id = buf_id,
      valid = valid
    }
    
    if valid then
      info.valid_buffers = info.valid_buffers + 1
    end
  end
  
  return info
end

return M
