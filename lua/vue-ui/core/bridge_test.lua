--- Bridge Test Module
-- @module bridge_test
-- @author Cheik Kone
-- @license MIT
-- @copyright Cheik Kone 2025
--
-- This module provides test handlers for the bridge communication

local bridge = require('vue-ui.core.bridge')

local M = {}

-- Initialize the test handlers
function M.initialize()
  -- Register a handler for the 'ping' action
  bridge.register_handler('ping', function(message)
    if message.type == bridge.MESSAGE_TYPE.REQUEST and message.action == 'ping' then
      vim.api.nvim_echo({{'[BridgeTest] Received ping request: ' .. vim.fn.json_encode(message.payload), 'Normal'}}, false, {})
      
      -- Create a response message
      local response = bridge.create_message(
        message.id,
        bridge.MESSAGE_TYPE.RESPONSE,
        'pong',
        {
          message = 'Hello from Lua!',
          received = message.payload,
          timestamp = os.time() * 1000
        }
      )
      
      -- Set correlation ID to link request and response
      response.correlationId = message.correlationId
      
      -- Send the response back to TypeScript
      bridge.sendMessage(response)
      
      return true
    end
    
    return false
  end)
  
  vim.api.nvim_echo({{'[BridgeTest] Test handlers initialized', 'Normal'}}, false, {})
  return true
end

return M
