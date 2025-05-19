--- Core Keymap Module for Vue UI Components
-- @module core_keymap
-- @author Cheik Kone
-- @license MIT
-- @copyright Cheik Kone 2025
--
-- This module provides key mapping utilities for UI components,
-- handling key binding, unbinding, and callback management.

local M = {}

--- Creates key mappings for a buffer
-- @param buffer_id number Buffer ID
-- @param mappings table Key mappings
-- @return table Created mappings
function M.create_mappings(buffer_id, mappings)
  local created_mappings = {}
  
  for key, mapping in pairs(mappings) do
    local mode = mapping.mode or 'n'
    local callback = mapping.callback
    local opts = {
      callback = callback,
      noremap = mapping.noremap or true,
      silent = mapping.silent or true,
      expr = mapping.expr or false,
      desc = mapping.desc or ''
    }
    
    vim.api.nvim_buf_set_keymap(buffer_id, mode, key, '', opts)
    
    table.insert(created_mappings, {
      buffer_id = buffer_id,
      key = key,
      mode = mode,
      callback = callback
    })
  end
  
  return created_mappings
end

--- Removes key mappings from a buffer
-- @param buffer_id number Buffer ID
-- @param mappings table Key mappings to remove
-- @return boolean True if mappings were removed
function M.remove_mappings(buffer_id, mappings)
  if not vim.api.nvim_buf_is_valid(buffer_id) then
    return false
  end
  
  for _, mapping in ipairs(mappings) do
    local mode = mapping.mode or 'n'
    local key = mapping.key
    
    pcall(vim.api.nvim_buf_del_keymap, buffer_id, mode, key)
  end
  
  return true
end

--- Creates select component key mappings
-- @param buffer_id number Buffer ID
-- @param component table Select component instance
-- @return table Created mappings
function M.create_select_mappings(buffer_id, component)
  local mappings = {
    ['<CR>'] = {
      callback = function() component:confirm() end,
      desc = 'Confirm selection'
    },
    ['<Esc>'] = {
      callback = function() component:cancel() end,
      desc = 'Cancel selection'
    },
    ['j'] = {
      callback = function() component:focus_next_option() end,
      desc = 'Focus next option'
    },
    ['k'] = {
      callback = function() component:focus_prev_option() end,
      desc = 'Focus previous option'
    },
    ['<Down>'] = {
      callback = function() component:focus_next_option() end,
      desc = 'Focus next option'
    },
    ['<Up>'] = {
      callback = function() component:focus_prev_option() end,
      desc = 'Focus previous option'
    },
    ['<Tab>'] = {
      callback = function() component:focus_next_option() end,
      desc = 'Focus next option'
    },
    ['<S-Tab>'] = {
      callback = function() component:focus_prev_option() end,
      desc = 'Focus previous option'
    }
  }
  
  -- Add multi-select specific mappings
  if component.multi then
    mappings[' '] = {
      callback = function()
        if component.focused_option_index >= 0 then
          component:toggle_option(component.focused_option_index)
        end
      end,
      desc = 'Toggle option selection'
    }
  else
    mappings[' '] = {
      callback = function()
        if component.focused_option_index >= 0 then
          component:select_option(component.focused_option_index)
          component:confirm()
        end
      end,
      desc = 'Select option and confirm'
    }
  end
  
  return M.create_mappings(buffer_id, mappings)
end

--- Creates dynamic key mappings based on component methods
-- @param buffer_id number Buffer ID
-- @param component table Component instance
-- @return table Created mappings
function M.create_dynamic_mappings(buffer_id, component)
  local mappings = {}
  
  -- Detect available methods and create appropriate mappings
  if type(component.confirm) == 'function' then
    mappings['<CR>'] = {
      callback = function() component:confirm() end,
      desc = 'Confirm'
    }
  end
  
  if type(component.cancel) == 'function' then
    mappings['<Esc>'] = {
      callback = function() component:cancel() end,
      desc = 'Cancel'
    }
  end
  
  if type(component.focus_next_option) == 'function' or type(component.focus_next) == 'function' then
    local next_fn = component.focus_next_option or component.focus_next
    
    mappings['j'] = {
      callback = function() next_fn(component) end,
      desc = 'Focus next'
    }
    
    mappings['<Down>'] = {
      callback = function() next_fn(component) end,
      desc = 'Focus next'
    }
    
    mappings['<Tab>'] = {
      callback = function() next_fn(component) end,
      desc = 'Focus next'
    }
  end
  
  if type(component.focus_prev_option) == 'function' or type(component.focus_prev) == 'function' then
    local prev_fn = component.focus_prev_option or component.focus_prev
    
    mappings['k'] = {
      callback = function() prev_fn(component) end,
      desc = 'Focus previous'
    }
    
    mappings['<Up>'] = {
      callback = function() prev_fn(component) end,
      desc = 'Focus previous'
    }
    
    mappings['<S-Tab>'] = {
      callback = function() prev_fn(component) end,
      desc = 'Focus previous'
    }
  end
  
  if type(component.toggle_option) == 'function' and component.multi then
    mappings[' '] = {
      callback = function()
        if component.focused_option_index >= 0 then
          component:toggle_option(component.focused_option_index)
        end
      end,
      desc = 'Toggle option'
    }
  elseif type(component.select_option) == 'function' then
    mappings[' '] = {
      callback = function()
        if component.focused_option_index >= 0 then
          component:select_option(component.focused_option_index)
          if type(component.confirm) == 'function' then
            component:confirm()
          end
        end
      end,
      desc = 'Select and confirm'
    }
  end
  
  return M.create_mappings(buffer_id, mappings)
end

return M
