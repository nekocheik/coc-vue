-- handlers.lua
-- Event handlers for Vue UI components

local M = {}
local event_bridge = require('vue-ui.utils.event_bridge')
local schema = require('vue-ui.events.schema')

-- Handler for component creation events
local function handle_component_create(event_data)
  -- Get component type
  local component_type = event_data.component_type
  
  -- Load component module
  local ok, component_module = pcall(require, 'vue-ui.components.' .. component_type)
  if not ok then
    vim.api.nvim_echo({{"[VueUI] Component module not found: " .. component_type, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Check if component already exists
  local existing = event_bridge.get_component(event_data.id)
  if existing then
    vim.api.nvim_echo({{"[VueUI] A component with this ID already exists: " .. event_data.id, "WarningMsg"}}, false, {})
    return false
  end
  
  -- Create component
  if component_module.create_from_data then
    local component = component_module.create_from_data(event_data)
    if component then
      return true
    end
  end
  
  return false
end

-- Handler for component update events
M[schema.EVENT_TYPES.COMPONENT_UPDATED] = function(data)
  -- Get component
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Component not found: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Update component
  if component.update then
    return component:update(data.changes)
  end
  
  return false
end

-- Handler for component destruction events
M[schema.EVENT_TYPES.COMPONENT_DESTROYED] = function(data)
  -- Get component
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Component not found: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Destroy component
  if component.destroy then
    local success = component:destroy()
    if success then
      event_bridge.unregister_component(data.id)
      return true
    end
  else
    -- If no destroy method, just remove from registry
    event_bridge.unregister_component(data.id)
    return true
  end
  
  return false
end

-- Handler for component focus events
M[schema.EVENT_TYPES.COMPONENT_FOCUSED] = function(data)
  -- Get component
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Component not found: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Focus component
  if component.focus then
    return component:focus()
  end
  
  return false
end

-- Handler for component focus loss events
M[schema.EVENT_TYPES.COMPONENT_BLURRED] = function(data)
  -- Get component
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Component not found: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Remove focus from component
  if component.blur then
    return component:blur()
  end
  
  return false
end

-- Handler for button click events
M[schema.EVENT_TYPES.BUTTON_CLICKED] = function(data)
  -- Get component
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Button not found: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Click button
  if component.click then
    return component:click()
  end
  
  return false
end

-- Handler for input field value change events
M[schema.EVENT_TYPES.INPUT_CHANGED] = function(data)
  -- Get component
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Input field not found: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Update value
  if component.set_value then
    return component:set_value(data.value)
  end
  
  return false
end

-- Handler for input field submission events
M[schema.EVENT_TYPES.INPUT_SUBMITTED] = function(data)
  -- Get component
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Input field not found: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Submit value
  if component.submit then
    return component:submit()
  end
  
  return false
end

-- Handler for input field cancellation events
M[schema.EVENT_TYPES.INPUT_CANCELLED] = function(data)
  -- Get component
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Input field not found: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Cancel input
  if component.cancel then
    return component:cancel()
  end
  
  return false
end

-- Handler for list item selection events
M[schema.EVENT_TYPES.LIST_ITEM_SELECTED] = function(data)
  -- Get component
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] List not found: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Select item
  if component.select_item then
    return component:select_item(data.item_index)
  end
  
  return false
end

-- Handler for modal opening events
M[schema.EVENT_TYPES.MODAL_OPENED] = function(data)
  -- Get component
  local component = event_bridge.get_component(data.id)
  if not component then
    -- If modal doesn't exist yet, create it
    local ok, modal_module = pcall(require, 'vue-ui.components.modal')
    if not ok then
      vim.api.nvim_echo({{"[VueUI] Modal module not found", "ErrorMsg"}}, false, {})
      return false
    end
    
    -- Create modal
    local modal = modal_module.create(data.id, data.title or "Modal", data.content, data.options)
    if modal then
      -- Open modal
      if modal.open then
        return modal:open()
      end
    end
    
    return false
  end
  
  -- Open existing modal
  if component.open then
    return component:open()
  end
  
  return false
end

-- Handler for modal closing events
M[schema.EVENT_TYPES.MODAL_CLOSED] = function(data)
  -- Get component
  local component = event_bridge.get_component(data.id)
  if not component then
    vim.api.nvim_echo({{"[VueUI] Modal not found: " .. data.id, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Close modal
  if component.close then
    return component:close()
  end
  
  return false
end

-- Handler for notification display events
M[schema.EVENT_TYPES.NOTIFICATION_SHOWN] = function(data)
  -- Load notification module
  local ok, notification_module = pcall(require, 'vue-ui.components.notification')
  if not ok then
    vim.api.nvim_echo({{"[VueUI] Notification module not found", "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Show notification
  return notification_module.show(data.id, data.type, data.message, data.timeout, data.actions)
end

-- Default handler for unhandled events
M.default = function(event_type, data)
  vim.api.nvim_echo({{"[VueUI] Unhandled event: " .. event_type, "WarningMsg"}}, false, {})
  return false
end

-- Function to dispatch an event
function M.dispatch(event_type, data)
  -- Validate event
  local valid, error_message = schema.validate_event(event_type, data)
  if not valid then
    vim.api.nvim_echo({{"[VueUI] Invalid event: " .. error_message, "ErrorMsg"}}, false, {})
    return false
  end
  
  -- Dispatch event to appropriate handler
  local handler = M[event_type] or M.default
  return handler(data)
end

return M
