-- Test Demo for the Select component
local M = {}

-- Function to create and display an interactive select
function M.show_select_demo()
  -- Load the Select module
  local Select = require('vue-ui.components.select')
  
  -- Create a Select instance with options
  local select = Select:new({
    id = 'test-select-demo',
    title = 'Select an option',
    width = 40,
    style = 'default',
    options = {
      { id = '1', text = 'Option 1 - First option' },
      { id = '2', text = 'Option 2 - Second option' },
      { id = '3', text = 'Option 3 - Third option' },
      { id = '4', text = 'Option 4 - Fourth option' },
      { id = '5', text = 'Option 5 - Fifth option' },
      { id = '6', text = 'Option 6 - Sixth option' },
    },
    placeholder = 'Choose an option...',
    multi = false,
    max_visible_options = 4
  })
  
  -- Open the select
  select:open()
  
  return select
end

-- Function to create and display a multi-select component
function M.show_multiselect_demo()
  -- Load the Select module
  local Select = require('vue-ui.components.select')
  
  -- Create a Select instance with options and multi=true
  local select = Select:new({
    id = 'test-multiselect-demo',
    title = 'Select multiple options',
    width = 40,
    style = 'default',
    options = {
      { id = '1', text = 'Option 1 - First option' },
      { id = '2', text = 'Option 2 - Second option' },
      { id = '3', text = 'Option 3 - Third option' },
      { id = '4', text = 'Option 4 - Fourth option' },
      { id = '5', text = 'Option 5 - Fifth option' },
    },
    placeholder = 'Choose multiple options...',
    multi = true,
    max_visible_options = 4
  })
  
  -- Open the select
  select:open()
  
  return select
end

return M
