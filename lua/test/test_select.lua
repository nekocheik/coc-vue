-- Test script for Select component
local function test_select()
  -- Load the vue-ui module
  local vue_ui = require('vue-ui.init')
  
  -- Create a test select configuration
  local config = {
    multi = false,
    options = {
      { id = "option1", text = "Option 1", value = "value1" },
      { id = "option2", text = "Option 2", value = "value2" },
      { id = "option3", text = "Option 3", value = "value3" }
    }
  }
  
  -- Create and open the select component
  local select = vue_ui.select.create("test_select", "Select Demo", config)
  if select then
    print("SUCCESS: Select component created")
    select:open()
    print("SUCCESS: Select component opened")
    return true
  else
    print("ERROR: Failed to create Select component")
    return false
  end
end

-- Run the test
return test_select()
