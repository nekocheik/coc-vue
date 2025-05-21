-- test/lua/bridge_spec.lua
-- Busted tests for the bridge core

-- Mock vim global
_G.vim = {
  api = {
    nvim_echo = function(messages, history, opts) end,
    nvim_get_current_buf = function() return 1 end,
    nvim_buf_get_lines = function(bufnr, start, end_line, strict) return {} end,
    nvim_buf_set_lines = function(bufnr, start, end_line, strict, lines) end,
    nvim_command = function(cmd) end,
    nvim_eval = function(expr) return nil end
  },
  fn = {
    json_encode = vim.json and vim.json.encode or function(obj)
      -- Simple JSON encoder for tests
      if type(obj) == "table" then
        local items = {}
        for k, v in pairs(obj) do
          if type(k) == "number" then
            if type(v) == "string" then
              table.insert(items, '"' .. v .. '"')
            elseif type(v) == "number" or type(v) == "boolean" then
              table.insert(items, tostring(v))
            elseif type(v) == "table" then
              table.insert(items, vim.fn.json_encode(v))
            end
          else
            if type(v) == "string" then
              table.insert(items, '"' .. k .. '":"' .. v .. '"')
            elseif type(v) == "number" or type(v) == "boolean" then
              table.insert(items, '"' .. k .. '":' .. tostring(v))
            elseif type(v) == "table" then
              table.insert(items, '"' .. k .. '":' .. vim.fn.json_encode(v))
            end
          end
        end
        if #items > 0 and type(obj[1]) ~= nil then
          return "[" .. table.concat(items, ",") .. "]"
        else
          return "{" .. table.concat(items, ",") .. "}"
        end
      elseif type(obj) == "string" then
        return '"' .. obj .. '"'
      elseif type(obj) == "number" or type(obj) == "boolean" then
        return tostring(obj)
      end
      return "null"
    end,
    json_decode = vim.json and vim.json.decode or function(json_str)
      -- This is just a stub for testing
      -- In real tests, you would use a proper JSON parser
      if json_str == '{"id":"test_component","type":"event","action":"test_action","payload":{"value":"test_value"}}' then
        return {
          id = "test_component",
          type = "event",
          action = "test_action",
          payload = {
            value = "test_value"
          }
        }
      end
      return {}
    end,
    stdpath = function(what)
      return "/tmp/nvim-test"
    end
  },
  cmd = function(cmd) end
}

-- Load the bridge module
local bridge = require('vue-ui.core.bridge')

-- Test suite
describe("Bridge Core", function()
  -- Reset bridge state before each test
  before_each(function()
    -- Clear handlers
    package.loaded['vue-ui.core.bridge'] = nil
    bridge = require('vue-ui.core.bridge')
    bridge.initialize()
  end)
  
  describe("Message creation", function()
    it("should create a valid bridge message", function()
      local message = bridge.create_message("test_component", bridge.MESSAGE_TYPE.EVENT, "test_action", { value = "test_value" })
      
      assert.are.equal("test_component", message.id)
      assert.are.equal(bridge.MESSAGE_TYPE.EVENT, message.type)
      assert.are.equal("test_action", message.action)
      assert.are.equal("test_value", message.payload.value)
      assert.is_not_nil(message.timestamp)
    end)
  end)
  
  describe("Message receiving", function()
    it("should process received messages", function()
      -- Create a test handler
      local handler_called = false
      local received_message = nil
      
      bridge.register_handler("test_action", function(message)
        handler_called = true
        received_message = message
        return true
      end)
      
      -- Create a test message
      local json_message = '{"id":"test_component","type":"event","action":"test_action","payload":{"value":"test_value"}}'
      
      -- Process the message
      bridge.receiveMessage(json_message)
      
      -- Check if the handler was called with the correct message
      assert.is_true(handler_called)
      assert.are.equal("test_component", received_message.id)
      assert.are.equal("event", received_message.type)
      assert.are.equal("test_action", received_message.action)
      assert.are.equal("test_value", received_message.payload.value)
    end)
    
    it("should handle invalid JSON", function()
      -- Spy on error handling
      local error_called = false
      local original_echo = vim.api.nvim_echo
      vim.api.nvim_echo = function(messages, history, opts)
        if messages[1][1]:match("Failed to parse message") then
          error_called = true
        end
      end
      
      -- Process invalid JSON
      bridge.receiveMessage("invalid json")
      
      -- Check if error was reported
      assert.is_true(error_called)
      
      -- Restore original function
      vim.api.nvim_echo = original_echo
    end)
  end)
  
  describe("Handler registration", function()
    it("should register and unregister action handlers", function()
      -- Create a test handler
      local handler_called = false
      local handler = function(message)
        handler_called = true
        return true
      end
      
      -- Register the handler
      bridge.register_handler("test_action", handler)
      
      -- Create a test message
      local message = bridge.create_message("test_component", bridge.MESSAGE_TYPE.EVENT, "test_action", { value = "test_value" })
      
      -- Process the message directly (bypass JSON serialization for this test)
      local handlers = package.loaded['vue-ui.core.bridge'].action_handlers
      for _, h in ipairs(handlers["test_action"] or {}) do
        h(message)
      end
      
      -- Check if the handler was called
      assert.is_true(handler_called)
      
      -- Reset flag
      handler_called = false
      
      -- Unregister the handler
      bridge.unregister_handler("test_action", handler)
      
      -- Process the message again
      handlers = package.loaded['vue-ui.core.bridge'].action_handlers
      for _, h in ipairs(handlers["test_action"] or {}) do
        h(message)
      end
      
      -- Check that the handler was not called
      assert.is_false(handler_called)
    end)
    
    it("should register and unregister global handlers", function()
      -- Create a test handler
      local handler_called = false
      local handler = function(message)
        handler_called = true
        return true
      end
      
      -- Register the global handler
      bridge.register_global_handler(handler)
      
      -- Create a test message
      local message = bridge.create_message("test_component", bridge.MESSAGE_TYPE.EVENT, "any_action", { value = "test_value" })
      
      -- Process the message directly (bypass JSON serialization for this test)
      local global_handlers = package.loaded['vue-ui.core.bridge'].global_handlers
      for _, h in ipairs(global_handlers or {}) do
        h(message)
      end
      
      -- Check if the handler was called
      assert.is_true(handler_called)
      
      -- Reset flag
      handler_called = false
      
      -- Unregister the handler
      bridge.unregister_global_handler(handler)
      
      -- Process the message again
      global_handlers = package.loaded['vue-ui.core.bridge'].global_handlers
      for _, h in ipairs(global_handlers or {}) do
        h(message)
      end
      
      -- Check that the handler was not called
      assert.is_false(handler_called)
    end)
  end)
  
  describe("Message sending", function()
    it("should send messages to TypeScript", function()
      -- Spy on vim.cmd
      local cmd_called = false
      local cmd_args = nil
      local original_cmd = vim.cmd
      vim.cmd = function(cmd)
        if cmd:match("call CocVueBridgeReceiveMessage") then
          cmd_called = true
          cmd_args = cmd
        end
      end
      
      -- Create and send a test message
      local message = bridge.create_message("test_component", bridge.MESSAGE_TYPE.EVENT, "test_action", { value = "test_value" })
      bridge.sendMessage(message)
      
      -- Check if vim.cmd was called with the correct command
      assert.is_true(cmd_called)
      assert.is_not_nil(cmd_args:match("test_component"))
      assert.is_not_nil(cmd_args:match("test_action"))
      assert.is_not_nil(cmd_args:match("test_value"))
      
      -- Restore original function
      vim.cmd = original_cmd
    end)
  end)
end)
