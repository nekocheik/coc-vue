-- Script to run Vader tests with the correct Lua environment
local function setup_lua_path()
  -- Add current directory to Lua search path
  package.path = package.path .. ";./lua/?.lua;./lua/?/init.lua"
  
  -- Check that modules are accessible
  local validation = require('vue-ui.utils.validation')
  local event_bridge = require('vue-ui.utils.event_bridge')
  local test_helpers = require('vue-ui.utils.test_helpers')
  local schema = require('vue-ui.events.schema')
  
  print("Modules loaded successfully!")
end

-- Configure environment
setup_lua_path()

-- Run tests
vim.cmd("Vader! test/vader/select.vader")
