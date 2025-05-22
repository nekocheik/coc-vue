-- vue-ui/utils/window_manager.lua
-- Window layout manager for coc-vue

local M = {}

-- Store window IDs for different slots
M.windows = {
  ['slot-left'] = nil,
  ['slot-center-top'] = nil,
  ['slot-center-bottom'] = nil,
  ['slot-right'] = nil,
  ['bar-top'] = nil,
  ['bar-bottom'] = nil
}

-- Store buffer IDs for different slots
M.buffers = {}

-- Store sizes for different slots
M.sizes = {
  ['slot-left'] = 30,
  ['slot-center-top'] = 50,
  ['slot-center-bottom'] = 20,
  ['slot-right'] = 30,
  ['bar-top'] = 2,
  ['bar-bottom'] = 2
}

-- Helper function to create a window for a slot
local function create_window(slot, buffer_id, position, size)
  -- Validate the buffer ID first
  if not buffer_id or not vim.api.nvim_buf_is_valid(buffer_id) then
    vim.api.nvim_err_writeln(string.format("Invalid buffer ID for slot %s: %s", slot, tostring(buffer_id)))
    return nil
  end

  local cmd = ''
  
  if position == 'top' then
    cmd = string.format('topleft %dsplit', size)
  elseif position == 'bottom' then
    cmd = string.format('botright %dsplit', size)
  elseif position == 'left' then
    cmd = string.format('vertical topleft %dsplit', size)
  elseif position == 'right' then
    cmd = string.format('vertical botright %dsplit', size)
  end
  
  vim.cmd(cmd)
  local win_id = vim.api.nvim_get_current_win()
  vim.api.nvim_win_set_buf(win_id, buffer_id)
  
  -- Set window options
  vim.api.nvim_win_set_option(win_id, 'number', false)
  vim.api.nvim_win_set_option(win_id, 'relativenumber', false)
  vim.api.nvim_win_set_option(win_id, 'wrap', false)
  
  -- Store the window ID
  M.windows[slot] = win_id
  M.buffers[slot] = buffer_id
  
  return win_id
end

-- Validate buffer IDs before creating layout
function M.validate_buffers(buffers)
  local valid_buffers = {}
  local invalid_slots = {}
  
  for slot, buffer_id in pairs(buffers) do
    if buffer_id and vim.api.nvim_buf_is_valid(buffer_id) then
      valid_buffers[slot] = buffer_id
      vim.api.nvim_out_write(string.format("Validated buffer for %s: %s\n", slot, tostring(buffer_id)))
    else
      table.insert(invalid_slots, slot)
      vim.api.nvim_err_writeln(string.format("Invalid buffer ID for slot %s: %s", slot, tostring(buffer_id)))
    end
  end
  
  return valid_buffers, invalid_slots
end

-- Initialize the layout with buffers
function M.create_layout(buffers)
  -- Validate buffer IDs first
  local valid_buffers, invalid_slots = M.validate_buffers(buffers)
  
  if next(valid_buffers) == nil then
    vim.api.nvim_err_writeln("No valid buffers found. Cannot create layout.")
    return false
  end
  
  if #invalid_slots > 0 then
    vim.api.nvim_err_writeln("Some slots have invalid buffers: " .. table.concat(invalid_slots, ", "))
  end
  
  -- Save the current window
  local original_win = vim.api.nvim_get_current_win()
  
  -- Create a new tab
  vim.cmd('tabnew')
  vim.cmd('tabonly')
  
  -- Clear all windows
  vim.cmd('only')
  
  -- Create the windows in the correct order
  -- First: top bar
  if valid_buffers['bar-top'] then
    create_window('bar-top', valid_buffers['bar-top'], 'top', M.sizes['bar-top'])
  end
  
  -- First main window: left panel
  if valid_buffers['slot-left'] then
    create_window('slot-left', valid_buffers['slot-left'], 'left', M.sizes['slot-left'])
  end
  
  -- Move to the main area and create center-top
  vim.cmd('wincmd l')
  if valid_buffers['slot-center-top'] then
    local main_win = vim.api.nvim_get_current_win()
    -- Validate buffer again before setting
    if vim.api.nvim_buf_is_valid(valid_buffers['slot-center-top']) then
      vim.api.nvim_win_set_buf(main_win, valid_buffers['slot-center-top'])
      M.windows['slot-center-top'] = main_win
      M.buffers['slot-center-top'] = valid_buffers['slot-center-top']
    else
      vim.api.nvim_err_writeln("Buffer became invalid for slot-center-top")
    end
  end
  
  -- Create center-bottom split
  if valid_buffers['slot-center-bottom'] then
    create_window('slot-center-bottom', valid_buffers['slot-center-bottom'], 'bottom', M.sizes['slot-center-bottom'])
    vim.cmd('wincmd k') -- Go back to center-top
  end
  
  -- Create right panel
  if valid_buffers['slot-right'] then
    create_window('slot-right', valid_buffers['slot-right'], 'right', M.sizes['slot-right'])
    vim.cmd('wincmd h') -- Go back to center
  end
  
  -- Finally: bottom bar
  vim.cmd('wincmd j') -- Go to bottom window
  if valid_buffers['bar-bottom'] then
    create_window('bar-bottom', valid_buffers['bar-bottom'], 'bottom', M.sizes['bar-bottom'])
  end
  
  -- Set up some visual cues for bar areas if they exist
  if M.windows['bar-top'] then
    vim.api.nvim_win_set_option(M.windows['bar-top'], 'winhighlight', 'Normal:PmenuSel')
  end
  
  if M.windows['bar-bottom'] then
    vim.api.nvim_win_set_option(M.windows['bar-bottom'], 'winhighlight', 'Normal:PmenuSel')
  end
  
  -- Return to the main window
  vim.api.nvim_set_current_win(M.windows['slot-center-top'] or original_win)
  
  return true
end

-- Update a window's size
function M.resize_window(slot, size)
  local win_id = M.windows[slot]
  if not win_id then
    return false
  end
  
  M.sizes[slot] = size
  
  -- Save current window
  local current_win = vim.api.nvim_get_current_win()
  
  -- Focus the window to resize
  vim.api.nvim_set_current_win(win_id)
  
  -- Resize based on the slot type
  if slot == 'slot-left' or slot == 'slot-right' then
    vim.cmd('vertical resize ' .. size)
  else
    vim.cmd('resize ' .. size)
  end
  
  -- Restore focus
  vim.api.nvim_set_current_win(current_win)
  
  return true
end

-- Close all windows and reset state
function M.close_layout()
  for slot, _ in pairs(M.windows) do
    M.windows[slot] = nil
  end
  
  for slot, _ in pairs(M.buffers) do
    M.buffers[slot] = nil
  end
  
  vim.cmd('tabclose')
  return true
end

-- Mount a buffer in a specific slot
function M.mount_buffer(slot, buffer_id)
  local win_id = M.windows[slot]
  if not win_id then
    return false
  end
  
  vim.api.nvim_win_set_buf(win_id, buffer_id)
  M.buffers[slot] = buffer_id
  
  return true
end

-- Setup demo static content for bar areas
function M.setup_bar_content(bar_top_buffer, bar_bottom_buffer)
  -- Validate bar_top_buffer
  if bar_top_buffer and vim.api.nvim_buf_is_valid(bar_top_buffer) then
    vim.api.nvim_buf_set_option(bar_top_buffer, 'modifiable', true)
    vim.api.nvim_buf_set_lines(bar_top_buffer, 0, -1, false, {
      "====== COC-VUE TABS DEMO " .. string.rep("=", 50),
      "[Home] [Components] [Settings] [Help]" .. string.rep(" ", 30) .. "WindowManager Demo"
    })
    vim.api.nvim_buf_set_option(bar_top_buffer, 'modifiable', false)
    vim.api.nvim_out_write("Set content for top bar buffer " .. tostring(bar_top_buffer) .. "\n")
  else
    vim.api.nvim_err_writeln("Invalid top bar buffer: " .. tostring(bar_top_buffer))
  end
  
  -- Validate bar_bottom_buffer
  if bar_bottom_buffer and vim.api.nvim_buf_is_valid(bar_bottom_buffer) then
    vim.api.nvim_buf_set_option(bar_bottom_buffer, 'modifiable', true)
    vim.api.nvim_buf_set_lines(bar_bottom_buffer, 0, -1, false, {
      "Status: Ready" .. string.rep(" ", 20) .. "Layout: Default" .. string.rep(" ", 20) .. "Mode: Normal",
      "====== COC-VUE STATUS DEMO " .. string.rep("=", 50)
    })
    vim.api.nvim_buf_set_option(bar_bottom_buffer, 'modifiable', false)
    vim.api.nvim_out_write("Set content for bottom bar buffer " .. tostring(bar_bottom_buffer) .. "\n")
  else
    vim.api.nvim_err_writeln("Invalid bottom bar buffer: " .. tostring(bar_bottom_buffer))
  end
end

return M
