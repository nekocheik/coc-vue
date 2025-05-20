-- Test script to validate TypeScript to Lua integration
-- This script will simulate the CocCommand vue.selectDemo execution

local function log_result(test_name, result, details)
  local log_file = io.open("typescript_integration_test.log", "a")
  local message = test_name .. ": " .. result .. " - " .. details
  print(message)
  if log_file then
    log_file:write(message .. "\n")
    log_file:close()
  end
end

local function test_typescript_integration()
  -- Initialize log file
  local log_file = io.open("typescript_integration_test.log", "w")
  if log_file then
    log_file:write("=== TypeScript Integration Test ===\n\n")
    log_file:close()
  end

  -- Test 1: Load the vue-ui module
  local ok, vue_ui = pcall(require, 'vue-ui.init')
  if not ok then
    log_result("Module loading", "FAILURE", "Failed to load vue-ui.init: " .. tostring(vue_ui))
    return false
  end
  log_result("Module loading", "SUCCESS", "vue-ui.init loaded successfully")

  -- Test 2: Check if select module is available
  if not vue_ui.select then
    log_result("Select module", "FAILURE", "Select module not found in vue-ui")
    return false
  end
  log_result("Select module", "SUCCESS", "Select module is available")

  -- Test 3: Simulate the TypeScript command execution
  -- This is what happens when :CocCommand vue.selectDemo is executed
  local config = {
    multi = false,
    options = {
      { id = "option1", text = "Option 1", value = "value1" },
      { id = "option2", text = "Option 2", value = "value2" },
      { id = "option3", text = "Option 3", value = "value3" }
    }
  }
  
  local select = vue_ui.select.create("select_demo", "Select Demo", config)
  if not select then
    log_result("TypeScript integration", "FAILURE", "Failed to create select component via simulated TypeScript command")
    return false
  end
  log_result("TypeScript integration", "SUCCESS", "Select component created via simulated TypeScript command")

  -- Test 4: Open the select component (simulating what happens in the TypeScript layer)
  local open_result = select:open()
  if not open_result then
    log_result("TypeScript open command", "FAILURE", "Failed to open select component")
    return false
  end
  log_result("TypeScript open command", "SUCCESS", "Select component opened successfully")

  -- Test 5: Verify command registration (this is what the TypeScript layer depends on)
  local command_exists = vim.fn.exists(":VueUISelect") == 2
  if not command_exists then
    log_result("Command registration", "FAILURE", "VueUISelect command is not registered for TypeScript to use")
  else
    log_result("Command registration", "SUCCESS", "VueUISelect command is registered and available to TypeScript")
  end

  -- Test 6: Verify the command implementation
  if command_exists then
    -- Check if the command implementation is correct
    local cmd_info = vim.api.nvim_get_commands({})
    if cmd_info and cmd_info["VueUISelect"] then
      log_result("Command implementation", "SUCCESS", "VueUISelect command is properly implemented")
    else
      log_result("Command implementation", "FAILURE", "VueUISelect command exists but may not be properly implemented")
    end
  end

  -- Test summary
  log_result("TypeScript integration test", "COMPLETE", "All tests executed")
  return true
end

-- Run the tests
return test_typescript_integration()
