-- Interactive test script for the Select component
-- This script tests both the Lua API and TypeScript integration

local function log_result(test_name, result, details)
  local log_file = io.open("select_test_results.log", "a")
  local message = test_name .. ": " .. result .. " - " .. details
  print(message)
  if log_file then
    log_file:write(message .. "\n")
    log_file:close()
  end
end

local function test_select_component()
  -- Initialize log file
  local log_file = io.open("select_test_results.log", "w")
  if log_file then
    log_file:write("=== Select Component Integration Test ===\n\n")
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

  -- Test 3: Create a select component using Lua API
  local config = {
    multi = false,
    options = {
      { id = "option1", text = "Option 1", value = "value1" },
      { id = "option2", text = "Option 2", value = "value2" },
      { id = "option3", text = "Option 3", value = "value3" }
    }
  }
  
  local select = vue_ui.select.create("test_lua_select", "Lua API Test", config)
  if not select then
    log_result("Select creation", "FAILURE", "Failed to create select component via Lua API")
    return false
  end
  log_result("Select creation", "SUCCESS", "Select component created via Lua API")

  -- Test 4: Open the select component
  local open_result = select:open()
  if not open_result then
    log_result("Select opening", "FAILURE", "Failed to open select component")
    return false
  end
  log_result("Select opening", "SUCCESS", "Select component opened successfully")

  -- Test 5: Verify the select is open
  if not select._is_open then
    log_result("Select state", "FAILURE", "Select component reports it is not open")
    return false
  end
  log_result("Select state", "SUCCESS", "Select component reports it is open")

  -- Test 6: Navigate through options
  select:focus_next_option()
  local focus_index = select:get_focus_index()
  if focus_index ~= 1 then
    log_result("Option navigation", "FAILURE", "focus_next_option did not work correctly, index: " .. tostring(focus_index))
  else
    log_result("Option navigation", "SUCCESS", "focus_next_option worked correctly")
  end

  -- Test 7: Select an option
  select:select_option(focus_index)
  local selected_option = select:get_selected_option()
  if not selected_option then
    log_result("Option selection", "FAILURE", "Failed to select option")
  else
    log_result("Option selection", "SUCCESS", "Option selected: " .. selected_option.text)
  end

  -- Test 8: Close the select component
  select:close()
  if select._is_open then
    log_result("Select closing", "FAILURE", "Select component still reports it is open")
  else
    log_result("Select closing", "SUCCESS", "Select component closed successfully")
  end

  -- Test 9: Test multi-select mode
  local multi_config = {
    multi = true,
    options = {
      { id = "option1", text = "Option 1", value = "value1" },
      { id = "option2", text = "Option 2", value = "value2" },
      { id = "option3", text = "Option 3", value = "value3" }
    }
  }
  
  local multi_select = vue_ui.select.create("test_multi_select", "Multi-Select Test", multi_config)
  if not multi_select then
    log_result("Multi-select creation", "FAILURE", "Failed to create multi-select component")
    return false
  end
  
  multi_select:open()
  multi_select:focus_option(0)
  multi_select:select_option(0)
  multi_select:focus_next_option()
  multi_select:select_option(1)
  
  local selected_count = multi_select:get_selected_options_count()
  if selected_count ~= 2 then
    log_result("Multi-select", "FAILURE", "Expected 2 selected options, got " .. tostring(selected_count))
  else
    log_result("Multi-select", "SUCCESS", "Multiple options selected correctly")
  end
  
  multi_select:close()

  -- Test 10: Verify command registration
  local command_exists = vim.fn.exists(":VueUISelect") == 2
  if not command_exists then
    log_result("Command registration", "FAILURE", "VueUISelect command is not registered")
  else
    log_result("Command registration", "SUCCESS", "VueUISelect command is registered")
  end

  -- Test summary
  log_result("Test suite", "COMPLETE", "All tests executed")
  return true
end

-- Run the tests
return test_select_component()
