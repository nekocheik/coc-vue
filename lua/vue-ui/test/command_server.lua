-- lua/vue-ui/test/command_server.lua
-- TCP server for handling commands from Node.js client

local server = {}
local active_clients = {}
local server_socket = nil

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
  
  log("Starting command server...")
  
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
  
  -- Start listening
  status, err = pcall(function()
    server_socket:listen(128, function(listen_err)
      if listen_err then
        log("Listen error: " .. tostring(listen_err))
        return
      end
      
      log("Listen callback triggered, starting to accept connections")
    end)
    
    -- Accept connections in a loop
    local function accept_client()
      server_socket:accept(function(accept_err, client)
        on_new_client(accept_err, client)
        -- Continue accepting new clients
        vim.schedule(accept_client)
      end)
    end
    
    -- Start accepting clients
    accept_client()
    
    log("Acceptance loop started")
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
