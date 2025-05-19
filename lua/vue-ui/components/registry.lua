--- Component Registry for Vue UI
-- @module registry
-- @author Cheik Kone
-- @license MIT
-- @copyright Cheik Kone 2025

local event_bridge = require('vue-ui.utils.event_bridge')

local M = {}

--- Get a component by ID from the registry
-- @param id string Component ID
-- @return table|nil Component instance or nil if not found
function M.get_component(id)
  return event_bridge.get_component(id)
end

--- Register a component in the registry
-- @param id string Component ID
-- @param component table Component instance
-- @return table Component instance
function M.register_component(id, component)
  return event_bridge.register_component(id, component)
end

--- Unregister a component from the registry
-- @param id string Component ID
function M.unregister_component(id)
  return event_bridge.unregister_component(id)
end

return M
