-- lua/vue-ui/test/component_server.lua
-- TCP server for handling component commands from Node.js client

local server = {}
local active_clients = {}
local server_socket = nil
local loaded_components = {}

-- Import the Select component
local Select = require('vue-ui.components.select')

-- Log a message with timestamp
local function log(message)
  local timestamp = os.date("%Y-%m-%d %H:%M:%S")
  print(string.format("[SERVER %s] %s", timestamp, message))
end

-- Safe JSON encoding
local function safe_json_encode(data)
  local status, result = pcall(vim.fn.json_encode, data)
  if not status then
    log("JSON encoding error: " .. tostring(result))
    return nil
  end
  return result
end

-- Safe JSON decoding
local function safe_json_decode(json_str, callback)
  vim.schedule(function()
    local status, result = pcall(vim.fn.json_decode, json_str)
    if not status then
      log("JSON decoding error: " .. tostring(result))
      log("Raw JSON: " .. json_str)
      callback(nil)
      return
    end
    callback(result)
  end)
end

-- Send a response to the client
local function send_response(client, response)
  if not client or client:is_closing() then
    log("Cannot send response - client is nil or closed")
    return
  end
  
  -- Ensure we have a valid response object
  if type(response) ~= "table" then
    response = {type = "error", error = "Invalid response"}
  end
  
  -- Add newline to ensure message boundary
  local json_response = safe_json_encode(response)
  if not json_response then
    json_response = '{"type":"error","error":"JSON encoding error"}'
  end
  json_response = json_response .. "\n"
  
  log("Sending response: " .. json_response:sub(1, 200) .. (json_response:len() > 200 and "..." or ""))
  
  -- Send the response
  client:write(json_response, function(write_err)
    if write_err then
      log("Write error: " .. tostring(write_err))
    end
  end)
end

-- Get component state as a serializable table
local function get_component_state(component)
  local state = {}
  
  -- Common properties for all components
  state.id = component.id
  state.component_type = component.component_type
  state.title = component.title
  
  -- Select-specific properties
  if component.component_type == 'select' then
    -- Accéder à is_open comme une propriété et non comme une méthode
    state.is_open = component.is_open
    state.disabled = component.disabled
    state.required = component.required
    state.multi = component.multi
    state.placeholder = component.placeholder
    state.width = component.width
    state.style = component.style
    state.options = component.options
    state.selected_value = component.selected_value
    state.selected_text = component.selected_text
    state.focused_option_index = component.focused_option_index
    
    -- For multi-select, include selected options
    if component.multi then
      state.selected_options = component.selected_options
    else
      state.selected_option_index = component.selected_option_index
    end
  end
  
  return state
end

-- Clean all loaded components
local function clean_all_components()
  log("Cleaning all loaded components")
  for component_id, component in pairs(loaded_components) do
    log("Destroying component: " .. component_id)
    pcall(function()
      component:destroy()
    end)
  end
  loaded_components = {}
  log("All components cleaned")
end

-- Handle load_component command
local function handle_load_component(client, command)
  log("Handling load_component command: " .. vim.inspect(command))
  
  -- Validate command parameters
  if not command.name then
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Missing component name",
      code = "MISSING_PARAMETER"
    })
    return
  end
  
  -- Currently only support Select component
  if command.name ~= "Select" then
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Unsupported component type: " .. command.name,
      code = "UNSUPPORTED_COMPONENT"
    })
    return
  end
  
  -- Generate a unique component ID if not provided
  local component_id = command.component_id or "select_" .. os.time()
  
  -- Check if component with this ID already exists
  if loaded_components[component_id] then
    -- If force option is provided, destroy the existing component first
    if command.force then
      log("Force option provided, destroying existing component: " .. component_id)
      pcall(function()
        loaded_components[component_id]:destroy()
      end)
      loaded_components[component_id] = nil
    else
      send_response(client, {
        type = "error",
        id = command.id,
        error = "Component with ID " .. component_id .. " already exists",
        code = "COMPONENT_EXISTS"
      })
      return
    end
  end
  
  -- Create configuration for the component
  local config = {
    id = component_id,
    title = command.title or "Select",
    width = command.width or 30,
    style = command.style or 'default',
    options = command.options or {},
    placeholder = command.placeholder or 'Select...',
    disabled = command.disabled or false,
    required = command.required or false,
    multi = command.multi or false,
    max_visible_options = command.max_visible_options or 5
  }
  
  -- Create the component
  local success, component
  success, component = pcall(function()
    return Select:new(config)
  end)
  
  if not success then
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Failed to create component: " .. tostring(component),
      code = "COMPONENT_CREATION_FAILED"
    })
    return
  end
  
  -- Store the component
  loaded_components[component_id] = component
  
  -- Get available methods
  local methods = {
    "open", "close", "focus_option", "focus_next_option", "focus_prev_option",
    "select_option", "select_current_option", "select_by_value", "confirm",
    "cancel", "update_options", "set_disabled"
  }
  
  -- Get available props
  local props = {
    "title", "width", "style", "options", "placeholder", "disabled",
    "required", "multi", "max_visible_options"
  }
  
  -- Send response
  send_response(client, {
    type = "component_loaded",
    id = command.id,
    name = "Select",
    component_id = component_id,
    methods = methods,
    props = props,
    success = true
  })
end

-- Handle call_method command
local function handle_call_method(client, command)
  log("Handling call_method command: " .. vim.inspect(command))
  
  -- Validate command parameters
  if not command.component_id then
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Missing component_id parameter",
      code = "MISSING_PARAMETER"
    })
    return
  end
  
  if not command.method then
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Missing method parameter",
      code = "MISSING_PARAMETER"
    })
    return
  end
  
  -- Get the component
  local component = loaded_components[command.component_id]
  if not component then
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Component not found: " .. command.component_id,
      code = "COMPONENT_NOT_FOUND"
    })
    return
  end
  
  -- Check if the method exists
  if not component[command.method] then
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Method not found: " .. command.method,
      code = "METHOD_NOT_FOUND"
    })
    return
  end
  
  -- Call the method
  local args = command.args or {}
  local success, result
  
  success, result = pcall(function()
    if #args > 0 then
      return component[command.method](component, unpack(args))
    else
      return component[command.method](component)
    end
  end)
  
  if not success then
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Method execution failed: " .. tostring(result),
      code = "METHOD_EXECUTION_FAILED"
    })
    return
  end
  
  -- Send response
  send_response(client, {
    type = "method_result",
    id = command.id,
    component_id = command.component_id,
    method = command.method,
    result = result
  })
end

-- Handle get_state command
local function handle_get_state(client, command)
  log("Handling get_state command: " .. vim.inspect(command))
  
  -- Validate command parameters
  if not command.component_id then
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Missing component_id parameter",
      code = "MISSING_PARAMETER"
    })
    return
  end
  
  -- Get the component
  local component = loaded_components[command.component_id]
  if not component then
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Component not found: " .. command.component_id,
      code = "COMPONENT_NOT_LOADED"
    })
    return
  end
  
  -- Get the component state
  local state = get_component_state(component)
  
  -- Send response
  send_response(client, {
    type = "component_state",
    id = command.id,
    component_id = command.component_id,
    state = state
  })
end

-- Handle set_props command
local function handle_set_props(client, command)
  log("Handling set_props command: " .. vim.inspect(command))
  
  -- Validate command parameters
  if not command.component_id then
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Missing component_id parameter",
      code = "MISSING_PARAMETER"
    })
    return
  end
  
  if not command.props or type(command.props) ~= "table" then
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Missing or invalid props parameter",
      code = "MISSING_PARAMETER"
    })
    return
  end
  
  -- Get the component
  local component = loaded_components[command.component_id]
  if not component then
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Component not found: " .. command.component_id,
      code = "COMPONENT_NOT_LOADED"
    })
    return
  end
  
  -- Update the props
  local success = true
  local errors = {}
  
  for prop, value in pairs(command.props) do
    -- Handle special cases
    if prop == "options" then
      local update_success = component:update_options(value)
      if not update_success then
        success = false
        table.insert(errors, {
          prop = prop,
          error = "Failed to update options"
        })
      end
    elseif prop == "disabled" then
      local update_success = component:set_disabled(value)
      if not update_success then
        success = false
        table.insert(errors, {
          prop = prop,
          error = "Failed to set disabled state"
        })
      end
    else
      -- For other props, set them directly
      local set_success, set_error = pcall(function()
        component[prop] = value
      end)
      
      if not set_success then
        success = false
        table.insert(errors, {
          prop = prop,
          error = tostring(set_error)
        })
      end
    end
  end
  
  -- Send response
  if success then
    send_response(client, {
      type = "props_set",
      id = command.id,
      component_id = command.component_id,
      success = true
    })
  else
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Failed to set some props",
      code = "PROP_UPDATE_FAILED",
      details = errors
    })
  end
end

-- Handle unload_component command
local function handle_unload_component(client, command)
  log("Handling unload_component command: " .. vim.inspect(command))
  
  -- Validate command parameters
  if not command.component_id then
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Missing component_id parameter",
      code = "MISSING_PARAMETER"
    })
    return
  end
  
  -- Get the component
  local component = loaded_components[command.component_id]
  if not component then
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Component not found: " .. command.component_id,
      code = "COMPONENT_NOT_LOADED"
    })
    return
  end
  
  -- Destroy the component
  local success, error_msg = pcall(function()
    component:destroy()
  end)
  
  if not success then
    send_response(client, {
      type = "error",
      id = command.id,
      error = "Failed to destroy component: " .. tostring(error_msg),
      code = "COMPONENT_DESTROY_FAILED"
    })
    return
  end
  
  -- Remove the component from the loaded components
  loaded_components[command.component_id] = nil
  
  -- Send response
  send_response(client, {
    type = "component_unloaded",
    id = command.id,
    component_id = command.component_id,
    success = true
  })
end

-- Process a command
local function process_command(client, command)
  -- Log the received command
  log("Processing command: " .. vim.inspect(command))
  
  -- Validate command structure
  if type(command) ~= "table" then
    log("Invalid command format: not a table")
    send_response(client, {
      type = "error",
      error = "Invalid command format",
      id = nil
    })
    return
  end
  
  -- Extract command type and ID
  local cmd_type = command.type
  local cmd_id = command.id
  
  if not cmd_type then
    log("Invalid command: missing type field")
    send_response(client, {
      type = "error",
      error = "Missing command type",
      id = cmd_id
    })
    return
  end
  
  -- Handle different command types
  if cmd_type == "ping" then
    -- Ping command
    send_response(client, {
      type = "pong",
      id = cmd_id
    })
  elseif cmd_type == "echo" then
    -- Echo command
    if not command.data then
      log("Invalid echo command: missing data field")
      send_response(client, {
        type = "error",
        error = "Missing data field for echo command",
        id = cmd_id
      })
      return
    end
    
    send_response(client, {
      type = "echo",
      id = cmd_id,
      data = command.data
    })
  elseif cmd_type == "add" then
    -- Add command
    local a = command.a
    local b = command.b
    
    if type(a) ~= "number" or type(b) ~= "number" then
      log("Invalid add command: a and b must be numbers")
      send_response(client, {
        type = "error",
        error = "Parameters a and b must be numbers",
        id = cmd_id
      })
      return
    end
    
    local result = a + b
    send_response(client, {
      type = "result",
      id = cmd_id,
      result = result
    })
  elseif cmd_type == "clean_all" then
    -- Clean all components command
    log("Received clean_all command")
    clean_all_components()
    send_response(client, {
      type = "cleaned",
      id = cmd_id,
      success = true
    })
  elseif cmd_type == "load_component" then
    -- Load component command
    handle_load_component(client, command)
  elseif cmd_type == "call_method" then
    -- Call method command
    handle_call_method(client, command)
  elseif cmd_type == "get_state" then
    -- Get state command
    handle_get_state(client, command)
  elseif cmd_type == "set_props" then
    -- Set props command
    handle_set_props(client, command)
  elseif cmd_type == "unload_component" then
    -- Unload component command
    handle_unload_component(client, command)
  else
    -- Unknown command
    log("Unknown command type: " .. cmd_type)
    send_response(client, {
      type = "error",
      error = "Unknown command type: " .. cmd_type,
      id = cmd_id
    })
  end
end

-- Handle client data
local function handle_client_data(client, client_state, data)
  if not data then return end
  
  -- Add data to buffer
  client_state.buffer = client_state.buffer .. data
  log("Received data (" .. #data .. " bytes): " .. data:gsub("\n", "\\n"))
  log("Buffer now (" .. #client_state.buffer .. " bytes): " .. client_state.buffer:sub(1, 50) .. 
        (client_state.buffer:len() > 50 and "..." or ""))
  
  -- Process complete messages (separated by newlines)
  while true do
    local newline_pos = string.find(client_state.buffer, "\n")
    if not newline_pos then 
      log("No complete message found in buffer, waiting for more data")
      break 
    end
    
    log("Found newline at position " .. newline_pos)
    local message = string.sub(client_state.buffer, 1, newline_pos - 1)
    client_state.buffer = string.sub(client_state.buffer, newline_pos + 1)
    log("Extracted message: " .. message)
    
    -- Process the message in the main thread
    safe_json_decode(message, function(command)
      if command then
        local status, err = pcall(process_command, client, command)
        if not status then
          log("Error processing command: " .. tostring(err))
          send_response(client, {
            type = "error",
            error = "Internal server error: " .. tostring(err),
            id = command.id
          })
        end
      else
        log("Failed to decode JSON message")
        send_response(client, {
          type = "error",
          error = "Invalid JSON format",
          id = nil
        })
      end
    end)
  end
end

-- Handle a new client connection
local function on_new_client(err, client)
  if err then
    log("Accept error: " .. tostring(err))
    return
  end
  
  if not client then
    log("Error: received nil client")
    return
  end
  
  local ip, port = client:getpeername()
  log("Client connected from " .. ip .. ":" .. port)
  
  -- Create client state
  local client_state = {
    buffer = "",
    client = client
  }
  
  -- Add to active clients
  table.insert(active_clients, {client = client, state = client_state})
  
  -- Set up read handler
  client:read_start(function(read_err, data)
    if read_err then
      log("Read error: " .. tostring(read_err))
      client:close()
      return
    end
    
    if data then
      -- Process data
      local status, err = pcall(handle_client_data, client, client_state, data)
      if not status then
        log("Error handling client data: " .. tostring(err))
      end
    else
      -- EOF - client disconnected
      log("Client disconnected")
      
      -- Remove from active clients
      for i, c in ipairs(active_clients) do
        if c.client == client then
          table.remove(active_clients, i)
          break
        end
      end
      
      client:close()
    end
  end)
end

-- Start the server
function server.start(host, port)
  host = host or "127.0.0.1"
  port = port or 9999
  
  log("Starting component server...")
  
  -- Create server socket
  server_socket = vim.loop.new_tcp()
  
  -- Bind to host:port
  local status, err = pcall(function()
    server_socket:bind(host, port)
  end)
  
  if not status then
    log("Bind error: " .. tostring(err))
    return nil
  end
  
  -- Connection handler function
  local function on_connection(err)
    if err then
      log("Connection error: " .. tostring(err))
      return
    end
    
    -- Create client socket
    local client = vim.loop.new_tcp()
    
    -- Accept the connection
    if not server_socket:accept(client) then
      log("Accept error: Failed to accept client connection")
      client:close()
      return
    end
    
    -- Set up client
    local ip, port
    local ok, err = pcall(function()
      ip, port = client:getpeername()
    end)
    
    if ok and ip and port then
      log("Client connected from " .. ip .. ":" .. port)
    else
      log("Client connected (unable to get peer info)")
    end
    
    -- Create client state
    local client_state = {
      buffer = "",
      client = client
    }
    
    -- Add to active clients
    table.insert(active_clients, {client = client, state = client_state})
    
    -- Set up read handler
    client:read_start(function(read_err, data)
      if read_err then
        log("Read error: " .. tostring(read_err))
        client:close()
        return
      end
      
      if data then
        -- Process data
        local status, err = pcall(handle_client_data, client, client_state, data)
        if not status then
          log("Error handling client data: " .. tostring(err))
        end
      else
        -- EOF - client disconnected
        log("Client disconnected")
        
        -- Remove from active clients
        for i, c in ipairs(active_clients) do
          if c.client == client then
            table.remove(active_clients, i)
            break
          end
        end
        
        client:close()
      end
    end)
    
    -- Continue accepting connections
    server_socket:listen(128, on_connection)
  end
  
  -- Start listening for connections
  status, err = pcall(function()
    server_socket:listen(128, on_connection)
  end)
  
  if not status then
    log("Listen error: " .. tostring(err))
    return nil
  end
  
  log("Server listening on " .. host .. ":" .. port)
  return server_socket
end

-- Stop the server
function server.stop()
  log("Stopping server...")
  
  -- Destroy all loaded components
  for component_id, component in pairs(loaded_components) do
    log("Destroying component: " .. component_id)
    pcall(function()
      component:destroy()
    end)
  end
  loaded_components = {}
  
  -- Close all client connections
  for _, client_data in ipairs(active_clients) do
    if client_data.client and not client_data.client:is_closing() then
      client_data.client:close()
    end
  end
  active_clients = {}
  
  -- Close server socket
  if server_socket and not server_socket:is_closing() then
    server_socket:close()
  end
  
  log("Server stopped")
end

return server
