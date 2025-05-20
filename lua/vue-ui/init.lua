-- init.lua
-- Main entry point for the native Lua/Vim UI component library for CoC-Vue

-- Helper function to safely get Vim options in both Vim and Neovim
local function get_vim_option(option_name, default_value)
  -- Check if we're in Neovim (vim.o is available)
  if vim and vim.o then
    return vim.o[option_name] or default_value
  -- Check if we're in Vim with vim.eval
  elseif vim and vim.eval then
    local success, result = pcall(function() return vim.eval('&' .. option_name) end)
    if success then return result else return default_value end
  -- Fallback for other environments
  else
    return default_value
  end
end

-- Helper function to get data directory path in a cross-compatible way
local function get_data_path()
  -- Check if we're in Neovim with stdpath function
  if vim and vim.fn and vim.fn.stdpath then
    return vim.fn.stdpath('data')
  -- Check if we're in Vim with expand function
  elseif vim and vim.fn and vim.fn.expand then
    return vim.fn.expand('~/.vim')
  -- Fallback for minimal environments
  else
    return '.'
  end
end

-- Check and initialize runtime path
local function ensure_runtime_path()
  local current_path = vim.fn and vim.fn.expand('<sfile>:p:h:h:h') or '.'
  local rtp = get_vim_option('runtimepath', '')
  
  if not string.find(rtp, current_path, 1, true) then
    -- Use a safer way to display messages that works in both Vim and Neovim
    if vim and vim.api and vim.api.nvim_echo then
      vim.api.nvim_echo({{
        "[VueUI] Warning: Runtime path does not contain the extension directory. "
        .. "Some features might not work correctly.",
        "WarningMsg"
      }}, false, {})
    else
      print("[VueUI] Warning: Runtime path does not contain the extension directory.")
    end
    return false
  end
  
  return true
end

-- Check runtime path on module load
ensure_runtime_path()

local M = {}

-- Load dependencies
local event_bridge = require('vue-ui.utils.event_bridge')
local schema = require('vue-ui.events.schema')

-- Default configuration
local default_config = {
  debug = false,
  log_events = true,
  log_path = get_data_path() .. '/vue-ui-events.json',
  highlight_groups = {
    default = { fg = "Normal", bg = "Normal" },
    primary = { fg = "Function", bg = "Normal" },
    success = { fg = "String", bg = "Normal" },
    warning = { fg = "WarningMsg", bg = "Normal" },
    danger = { fg = "ErrorMsg", bg = "Normal" },
    focused = { fg = "Search", bg = "Normal" },
    disabled = { fg = "Comment", bg = "Normal" }
  }
}

-- Define highlight groups
function M.define_highlight_groups(groups)
  for name, colors in pairs(groups) do
    local cmd = "highlight default VueUI" .. name:gsub("^%l", string.upper)
    
    if colors.fg then
      cmd = cmd .. " guifg=" .. colors.fg
    end
    
    if colors.bg then
      cmd = cmd .. " guibg=" .. colors.bg
    end
    
    vim.cmd(cmd)
  end
end

-- Define user commands
function M.define_commands()
  print('[VUE-UI] Starting user command registration')
  
  -- Command to create a button
  vim.api.nvim_create_user_command('VueUIButton', function(opts)
    local args = opts.args
    if not args or args == "" then
      vim.api.nvim_echo({{"[VueUI] Missing arguments for VueUIButton command", "ErrorMsg"}}, false, {})
      return
    end
    
    local parts = vim.split(args, ' ')
    local id = parts[1]
    local label = parts[2] or "Button"
    
    -- Parse options from the remaining arguments
    local options_str = table.concat(parts, ' ', 3)
    local options = {}
    
    if options_str and options_str ~= "" then
      local success, parsed_options = pcall(vim.fn.json_decode, options_str)
      if success then
        options = parsed_options
      end
    end
    
    -- Create and render the button
    local button = M.button.create(id, label, options)
    if button then
      button:render()
      vim.api.nvim_echo({{"[VueUI] Button created: " .. id, "Normal"}}, false, {})
    else
      vim.api.nvim_echo({{"[VueUI] Failed to create button", "ErrorMsg"}}, false, {})
    end
  end, { nargs = '+' })
  
  -- Command to create an input
  vim.api.nvim_create_user_command('VueUIInput', function(opts)
    local args = opts.args
    if not args or args == "" then
      vim.api.nvim_echo({{"[VueUI] Missing arguments for VueUIInput command", "ErrorMsg"}}, false, {})
      return
    end
    
    local parts = vim.split(args, ' ')
    local id = parts[1]
    local label = parts[2] or "Input"
    
    -- Parse options from the remaining arguments
    local options_str = table.concat(parts, ' ', 3)
    local options = {}
    
    if options_str and options_str ~= "" then
      local success, parsed_options = pcall(vim.fn.json_decode, options_str)
      if success then
        options = parsed_options
      end
    end
    
    -- Create and render the input
    local input = M.input.create(id, label, options)
    if input then
      input:render()
      vim.api.nvim_echo({{"[VueUI] Input created: " .. id, "Normal"}}, false, {})
    else
      vim.api.nvim_echo({{"[VueUI] Failed to create input", "ErrorMsg"}}, false, {})
    end
  end, { nargs = '+' })
  
  -- Command to create a modal
  vim.api.nvim_create_user_command('VueUIModal', function(opts)
    local args = opts.args
    if not args or args == "" then
      vim.api.nvim_echo({{"[VueUI] Missing arguments for VueUIModal command", "ErrorMsg"}}, false, {})
      return
    end
    
    local parts = vim.split(args, ' ')
    local id = parts[1]
    local title = parts[2] or "Modal"
    
    -- Parse options from the remaining arguments
    local options_str = table.concat(parts, ' ', 3)
    local options = {}
    
    if options_str and options_str ~= "" then
      local success, parsed_options = pcall(vim.fn.json_decode, options_str)
      if success then
        options = parsed_options
      end
    end
    
    -- Create and render the modal
    local modal = M.modal.create(id, title, options)
    if modal then
      modal:render()
      vim.api.nvim_echo({{"[VueUI] Modal created: " .. id, "Normal"}}, false, {})
    else
      vim.api.nvim_echo({{"[VueUI] Failed to create modal", "ErrorMsg"}}, false, {})
    end
  end, { nargs = '+' })
  
  -- Command to create a Select component
  print('[VUE-UI] Registering VueUISelect command')
  vim.api.nvim_create_user_command('VueUISelect', function(opts)
    local args = opts.args
    if not args or args == "" then
      vim.api.nvim_echo({{"[VueUI] Missing arguments for VueUISelect command", "ErrorMsg"}}, false, {})
      return
    end
    
    local parts = vim.split(args, ' ')
    local id = parts[1]
    local title = parts[2] or "Select Component"
    
    -- Parse options from the remaining arguments
    local options_str = table.concat(parts, ' ', 3)
    local options = {}
    
    if options_str and options_str ~= "" then
      local success, parsed_options = pcall(vim.fn.json_decode, options_str)
      if success then
        options = parsed_options
      else
        -- Fallback to some default options if JSON parsing fails
        options = {
          multi = false,
          options = {
            { id = "option1", text = "Option 1", value = "value1" },
            { id = "option2", text = "Option 2", value = "value2" },
            { id = "option3", text = "Option 3", value = "value3" }
          }
        }
      end
    else
      -- Default options if none provided
      options = {
        multi = false,
        options = {
          { id = "option1", text = "Option 1", value = "value1" },
          { id = "option2", text = "Option 2", value = "value2" },
          { id = "option3", text = "Option 3", value = "value3" }
        }
      }
    end
    
    -- Create and open the select component
    local select = M.select.create(id, title, options)
    if select then
      select:open()
      vim.api.nvim_echo({{"[VueUI] Select component created and opened: " .. id, "Normal"}}, false, {})
    else
      vim.api.nvim_echo({{"[VueUI] Failed to create select component", "ErrorMsg"}}, false, {})
    end
  end, { nargs = '+' })
  
  -- Command to save the event log
  vim.api.nvim_create_user_command('VueUISaveEventLog', function(opts)
    local path = opts.args
    local success = M.save_event_log(path)
    
    if success then
      vim.api.nvim_echo({{"[VueUI] Event log saved to: " .. (path or M.event_log_path or "default location"), "Normal"}}, false, {})
    else
      vim.api.nvim_echo({{"[VueUI] Error saving event log", "ErrorMsg"}}, false, {})
    end
  end, { nargs = '?' })
  
  -- Command to clear the event log
  vim.api.nvim_create_user_command('VueUIClearEventLog', function()
    M.clear_event_log()
    vim.api.nvim_echo({{"[VueUI] Event log cleared", "Normal"}}, false, {})
  end, {})
  
  print('[VUE-UI] All user commands registered successfully')
end

-- Initialize the library
function M.setup(opts)
  -- Merge options with default configuration
  local config = vim.tbl_deep_extend("force", default_config, opts or {})
  
  -- Configure event bridge
  event_bridge.setup(config)
  
  -- Define highlight groups
  M.define_highlight_groups(config.highlight_groups)
  
  -- Expose components
  M.button = require('vue-ui.components.button')
  M.input = require('vue-ui.components.input')
  M.modal = require('vue-ui.components.modal')
  M.select = require('vue-ui.components.select')
  
  -- Expose utilities
  M.render = require('vue-ui.utils.render')
  M.validation = require('vue-ui.utils.validation')
  
  -- Expose events
  M.events = schema.EVENT_TYPES
  
  -- Expose event bridge methods
  M.emit = event_bridge.emit
  M.receive = event_bridge.receive
  M.save_event_log = event_bridge.save_event_log
  M.clear_event_log = event_bridge.clear_event_log
  
  -- Define TypeScript event reception function
  vim.api.nvim_create_user_command('VueUIReceiveEvent', function(opts)
    local args = opts.args
    if not args or args == "" then
      vim.api.nvim_echo({{"[VueUI] Missing arguments for VueUIReceiveEvent command", "ErrorMsg"}}, false, {})
      return
    end
    
    -- Parse arguments (format: event_name data_json)
    local event_name, data_json = args:match("^(%S+)%s+(.+)$")
    if not event_name or not data_json then
      vim.api.nvim_echo({{"[VueUI] Invalid argument format for VueUIReceiveEvent command", "ErrorMsg"}}, false, {})
      return
    end
    
    -- Decode JSON data
    local ok, data = pcall(vim.fn.json_decode, data_json)
    if not ok or not data then
      vim.api.nvim_echo({{"[VueUI] Invalid JSON data for VueUIReceiveEvent command", "ErrorMsg"}}, false, {})
      return
    end
    
    -- Receive event
    event_bridge.receive(event_name, data)
  end, { nargs = '+' })
  
  return M
end

-- Function to create a component test
function M.create_test(component_type, component_id, options)
  -- Create a Vader test file
  local test_file = vim.fn.tempname() .. '.vader'
  local file = io.open(test_file, 'w')
  
  if not file then
    vim.api.nvim_echo({{"[VueUI] Unable to create test file", "ErrorMsg"}}, false, {})
    return nil
  end
  
  -- Write test header
  file:write("# Automated test for " .. component_type .. " component with ID " .. component_id .. "\n\n")
  
  -- Write setup steps
  file:write("Given:\n")
  file:write("  " .. component_type .. " component setup\n\n")
  
  -- Write execution steps
  file:write("Execute:\n")
  file:write("  let g:test_component_id = '" .. component_id .. "'\n")
  file:write("  let g:test_component_type = '" .. component_type .. "'\n")
  
  -- Serialize options to JSON
  if options then
    local ok, options_json = pcall(vim.fn.json_encode, options)
    if ok then
      file:write("  let g:test_component_options = '" .. options_json:gsub("'", "\\'") .. "'\n")
    end
  end
  
  -- Add component-specific test commands
  if component_type == "button" then
    file:write("  " .. "call vue#test#create_button(g:test_component_id, 'Test Button', g:test_component_options)\n")
    file:write("  " .. "call vue#test#click_button(g:test_component_id)\n")
  elseif component_type == "input" then
    file:write("  " .. "call vue#test#create_input(g:test_component_id, 'Test Input', g:test_component_options)\n")
    file:write("  " .. "call vue#test#set_input_value(g:test_component_id, 'Test Value')\n")
  elseif component_type == "select" then
    file:write("  " .. "call vue#test#create_select(g:test_component_id, 'Test Select', g:test_component_options)\n")
    file:write("  " .. "call vue#test#open_select(g:test_component_id)\n")
    file:write("  " .. "call vue#test#select_option(g:test_component_id, 0)\n")
  end
  
  -- Close file
  file:close()
  
  -- Open test file in Neovim
  vim.cmd("edit " .. test_file)
  
  return test_file
end

-- Register all commands at module level
print('[VUE-UI] Registering commands at module level...')
M.define_commands()
print('[VUE-UI] Commands registered at module level')

-- Load components
M.button = require('vue-ui.components.button')
M.input = require('vue-ui.components.input')
M.modal = require('vue-ui.components.modal')
M.select = require('vue-ui.components.select')

-- Initialize the bridge
print('[VUE-UI] Initializing bridge core...')
M.bridge = require('vue-ui.core.bridge')
M.bridge.initialize()

-- Initialize bridge test module
print('[VUE-UI] Initializing bridge test module...')
M.bridge_test = require('vue-ui.core.bridge_test')
M.bridge_test.initialize()
print('[VUE-UI] Bridge initialized successfully')

return M
