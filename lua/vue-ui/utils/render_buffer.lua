-- Rendering utility for Vue UI components
-- This module provides the RenderBuffer function which updates buffer content efficiently

local M = {}

--- RenderBuffer - Update a buffer with the specified lines
-- @param buf The buffer handle to update
-- @param lines Array of lines to set in the buffer
-- @return true on success, false on failure
function M.RenderBuffer(buf, lines)
  -- Validate inputs
  if not buf or not vim.api.nvim_buf_is_valid(buf) then
    vim.api.nvim_err_writeln('Invalid buffer handle: ' .. tostring(buf))
    return false
  end
  
  if not lines or type(lines) ~= 'table' then
    vim.api.nvim_err_writeln('Invalid lines array')
    return false
  end
  
  -- Make buffer modifiable
  local was_modifiable = vim.api.nvim_buf_get_option(buf, 'modifiable')
  vim.api.nvim_buf_set_option(buf, 'modifiable', true)
  
  -- Process line by line - efficient updates
  local success = pcall(function()
    -- Get current line count
    local line_count = vim.api.nvim_buf_line_count(buf)
    
    -- Iterate through all lines
    for i, line in ipairs(lines) do
      -- Skip undefined lines (no change needed)
      if line ~= vim.NIL then
        local idx = i - 1 -- 0-based index for nvim_buf API
        
        if idx < line_count then
          -- Replace existing line
          vim.api.nvim_buf_set_lines(buf, idx, idx + 1, false, {line})
        else
          -- Append new line at the end
          vim.api.nvim_buf_set_lines(buf, line_count, line_count, false, {line})
          line_count = line_count + 1
        end
      end
    end
    
    -- If there are more lines in the buffer than in our input, delete the extras
    if line_count > #lines then
      vim.api.nvim_buf_set_lines(buf, #lines, -1, false, {})
    end
  end)
  
  -- Restore previous modifiable state
  vim.api.nvim_buf_set_option(buf, 'modifiable', was_modifiable)
  
  return success
end

return M
