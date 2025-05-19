--- Bridge Core for Vue UI Components
-- @module bridge
-- @author Cheik Kone
-- @license MIT
-- @copyright Cheik Kone 2025
--
-- This module provides a generic communication bridge between Lua and TypeScript,
-- handling message passing without any component-specific logic.

local M = {}

-- Message types enum (mirroring TypeScript side)
M.MESSAGE_TYPE = {
  EVENT = 'event',
  ACTION = 'action',
  STATE = 'state',
  SYNC = 'sync',
  REQUEST = 'request',
  RESPONSE = 'response',
  ERROR = 'error'
}

-- Configuration
local config = {
  debug = false,
  log_messages = true,
  log_path = vim.fn.stdpath('data') .. '/vue-ui-bridge.json'
}

-- Tables for storing handlers
local action_handlers = {}
local global_handlers = {}
local message_queue = {}
local is_processing = false

-- Message log for debugging
local message_log = {}

-- Initialize the bridge
function M.initialize()
  if config.debug then
    vim.api.nvim_echo({{'[BridgeCore] Initializing bridge', 'Normal'}}, false, {})
  end
  return true
end

--- Create a new bridge message
-- @param id string Component instance identifier
-- @param type string Message type (from M.MESSAGE_TYPE)
-- @param action string Generic action name
-- @param payload any Additional data (optional)
-- @return table Bridge message
function M.create_message(id, type, action, payload)
  return {
    id = id,
    type = type,
    action = action,
    payload = payload,
    timestamp = os.time() * 1000, -- Approximate milliseconds timestamp
    correlationId = nil -- Will be set if needed for request/response
  }
end

--- Receive a message from TypeScript
-- @param serialized_message string JSON serialized message
-- @return any Result to be returned to TypeScript
function M.receiveMessage(serialized_message)
  if config.debug then
    vim.api.nvim_echo({{'[BridgeCore] Received message from TypeScript', 'Normal'}}, false, {})
  end
  
  -- Log the raw message if configured
  if config.log_messages then
    table.insert(message_log, {
      direction = 'received',
      raw = serialized_message,
      timestamp = os.time() * 1000
    })
  end
  
  local success, message = pcall(vim.fn.json_decode, serialized_message)
  if not success then
    local error_msg = '[BridgeCore] Failed to parse message: ' .. message
    vim.api.nvim_echo({{error_msg, 'ErrorMsg'}}, false, {})
    return M.create_error_response(nil, 'parse_error', error_msg)
  end
  
  -- Add to queue and process
  table.insert(message_queue, message)
  M.process_message_queue()
  
  -- For now, return a simple acknowledgment
  -- In a more advanced implementation, we might wait for a result
  return vim.fn.json_encode({ success = true, received = true })
end

--- Process the message queue
function M.process_message_queue()
  if is_processing or #message_queue == 0 then
    return
  end
  
  is_processing = true
  
  while #message_queue > 0 do
    local message = table.remove(message_queue, 1)
    
    -- Process with action-specific handlers
    local handlers = action_handlers[message.action] or {}
    for _, handler in ipairs(handlers) do
      local success, result = pcall(handler, message)
      if not success then
        vim.api.nvim_echo({{'[BridgeCore] Handler error: ' .. result, 'ErrorMsg'}}, false, {})
      end
    end
    
    -- Process with global handlers
    for _, handler in ipairs(global_handlers) do
      local success, result = pcall(handler, message)
      if not success then
        vim.api.nvim_echo({{'[BridgeCore] Global handler error: ' .. result, 'ErrorMsg'}}, false, {})
      end
    end
  end
  
  is_processing = false
end

--- Send a message to TypeScript
-- @param message table The message to send
-- @return boolean Success status
function M.sendMessage(message)
  if not message.timestamp then
    message.timestamp = os.time() * 1000
  end
  
  local serialized_message = vim.fn.json_encode(message)
  
  -- Log the message if configured
  if config.log_messages then
    table.insert(message_log, {
      direction = 'sent',
      message = message,
      timestamp = message.timestamp
    })
  end
  
  -- Escape single quotes for Vim command
  local escaped_message = serialized_message:gsub("'", "''")
  
  -- Send the message to TypeScript via Vim function
  local cmd = string.format("call CocVueBridgeReceiveMessage('%s')", escaped_message)
  
  local success, result = pcall(vim.cmd, cmd)
  if not success then
    vim.api.nvim_echo({{'[BridgeCore] Failed to send message: ' .. result, 'ErrorMsg'}}, false, {})
    return false
  end
  
  return true
end

--- Register a handler for a specific action
-- @param action string The action to handle
-- @param handler function The handler function
function M.register_handler(action, handler)
  if not action_handlers[action] then
    action_handlers[action] = {}
  end
  
  table.insert(action_handlers[action], handler)
  return true
end

--- Unregister a handler for a specific action
-- @param action string The action to unregister the handler from
-- @param handler function The handler function to unregister
function M.unregister_handler(action, handler)
  if not action_handlers[action] then
    return false
  end
  
  for i, h in ipairs(action_handlers[action]) do
    if h == handler then
      table.remove(action_handlers[action], i)
      return true
    end
  end
  
  return false
end

--- Register a global handler that receives all messages
-- @param handler function The global handler function
function M.register_global_handler(handler)
  table.insert(global_handlers, handler)
  return true
end

--- Unregister a global handler
-- @param handler function The global handler function to unregister
function M.unregister_global_handler(handler)
  for i, h in ipairs(global_handlers) do
    if h == handler then
      table.remove(global_handlers, i)
      return true
    end
  end
  
  return false
end

--- Create an error response message
-- @param correlation_id string Original message correlation ID
-- @param error_code string Error code
-- @param error_message string Error message
-- @return table Error message
function M.create_error_response(correlation_id, error_code, error_message)
  return {
    type = M.MESSAGE_TYPE.ERROR,
    action = 'error',
    correlationId = correlation_id,
    payload = {
      code = error_code,
      message = error_message
    },
    timestamp = os.time() * 1000
  }
end

--- Set bridge configuration
-- @param new_config table New configuration
function M.configure(new_config)
  for k, v in pairs(new_config) do
    config[k] = v
  end
end

--- Get message log
-- @return table Message log
function M.get_message_log()
  return message_log
end

--- Clear message log
function M.clear_message_log()
  message_log = {}
end

--- Save message log to file
function M.save_message_log()
  local log_file = io.open(config.log_path, 'w')
  if not log_file then
    vim.api.nvim_echo({{'[BridgeCore] Failed to open log file: ' .. config.log_path, 'ErrorMsg'}}, false, {})
    return false
  end
  
  log_file:write(vim.fn.json_encode(message_log))
  log_file:close()
  
  vim.api.nvim_echo({{'[BridgeCore] Message log saved to: ' .. config.log_path, 'Normal'}}, false, {})
  return true
end

return M
