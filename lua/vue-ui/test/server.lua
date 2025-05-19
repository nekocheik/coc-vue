-- lua/vue-ui/test/server.lua
-- Minimal TCP server for ping-pong protocol

local server = {}
local active_clients = {}
local server_socket = nil

-- Simple JSON encoder for Lua
local function json_encode(data)
  if type(data) == "nil" then
    return "null"
  elseif type(data) == "boolean" then
    return data and "true" or "false"
  elseif type(data) == "number" then
    return tostring(data)
  elseif type(data) == "string" then
    return '"' .. string.gsub(data, '[%z\1-\31\\"]', function(c)
      local special = {['\\'] = '\\\\', ['"'] = '\\"', ['\n'] = '\\n', ['\r'] = '\\r', ['\t'] = '\\t'}
      return special[c] or string.format('\\u%04x', string.byte(c))
    end) .. '"'
  elseif type(data) == "table" then
    local parts = {}
    local is_array = true
    local max_index = 0
    
    -- Check if it's an array
    for k, _ in pairs(data) do
      if type(k) ~= "number" or k <= 0 or math.floor(k) ~= k then
        is_array = false
        break
      end
      max_index = math.max(max_index, k)
    end
    is_array = is_array and max_index == #data
    
    if is_array then
      for i, v in ipairs(data) do
        table.insert(parts, json_encode(v))
      end
      return "[" .. table.concat(parts, ",") .. "]"
    else
      for k, v in pairs(data) do
        table.insert(parts, json_encode(k) .. ":" .. json_encode(v))
      end
      return "{" .. table.concat(parts, ",") .. "}"
    end
  end
  return '"' .. tostring(data) .. '"'
end

-- Simple JSON decoder for Lua
local function json_decode(str)
  local status, result
  
  -- First try Vim's JSON decoder if available
  if vim.json and vim.json.decode then
    status, result = pcall(vim.json.decode, str)
    if status then
      return result
    end
  end
  
  -- Fallback to loadstring for simple cases
  -- WARNING: This is NOT secure for untrusted input
  local f, err = loadstring("return " .. string.gsub(str, '"([%w_]+)":', "%1="))
  if f then
    setfenv(f, {})
    status, result = pcall(f)
    if status then
      return result
    end
  end
  
  -- If we get here, both methods failed
  error("Failed to decode JSON: " .. str)
end

-- Send a response to the client
local function send_response(client, response)
  if not client or client:is_closing() then
    print("[SERVER] Cannot send response - client is nil or closed")
    return
  end
  
  -- Ensure we have a valid response object
  if type(response) ~= "table" then
    response = {type = "error", error = "Invalid response"}
  end
  
  -- Add newline to ensure message boundary
  local json_response
  local status, err = pcall(function()
    json_response = json_encode(response) .. "\n"
  end)
  
  if not status then
    print("[SERVER] JSON encoding error: " .. tostring(err))
    json_response = '{"type":"error","error":"JSON encoding error"}\n'
  end
  
  print("[SERVER] Sending: " .. json_response:sub(1, 100) .. (json_response:len() > 100 and "..." or ""))
  
  -- Send the response
  client:write(json_response, function(write_err)
    if write_err then
      print("[SERVER] Write error: " .. tostring(write_err))
    end
  end)
end

-- Process a complete message
local function process_message(client, message_str)
  print("[SERVER] Processing message: " .. message_str:sub(1, 100) .. (message_str:len() > 100 and "..." or ""))
  
  local success, message = pcall(json_decode, message_str)
  if not success then
    print("[SERVER] JSON parse error: " .. tostring(message))
    send_response(client, {type = "error", error = "Invalid JSON"})
    return
  end
  
  -- Ensure message is a table with a type
  if type(message) ~= "table" or not message.type then
    print("[SERVER] Invalid message format")
    send_response(client, {type = "error", error = "Invalid message format"})
    return
  end
  
  print("[SERVER] Received command: " .. message.type .. ", ID: " .. (message.id or "<no id>"))
  
  -- Handle ping command
  if message.type == "ping" then
    local response = {type = "pong"}
    if message.id then
      response.id = message.id
    end
    send_response(client, response)
    return
  end
  
  -- Unknown command
  send_response(client, {type = "error", error = "Unknown command", id = message.id})
end

-- Handle client data
local function handle_client_data(client, client_state, data)
  if not data then return end
  
  -- Add data to buffer
  client_state.buffer = client_state.buffer .. data
  print("[SERVER] Received data, buffer now: " .. client_state.buffer:sub(1, 50) .. 
        (client_state.buffer:len() > 50 and "..." or ""))
  
  -- Process complete messages (separated by newlines)
  while true do
    local newline_pos = string.find(client_state.buffer, "\n")
    if not newline_pos then break end
    
    local message = string.sub(client_state.buffer, 1, newline_pos - 1)
    client_state.buffer = string.sub(client_state.buffer, newline_pos + 1)
    
    -- Process the message in the main thread
    vim.schedule(function()
      local status, err = pcall(process_message, client, message)
      if not status then
        print("[SERVER] Error processing message: " .. tostring(err))
        send_response(client, {type = "error", error = "Internal server error: " .. tostring(err)})
      end
    end)
  end
end

-- Handle a new client connection
local function on_new_client(err, client)
  if err then
    print("[SERVER] Accept error: " .. tostring(err))
    return
  end
  
  if not client then
    print("[SERVER] Error: received nil client")
    return
  end
  
  print("[SERVER] Client connected")
  
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
      print("[SERVER] Read error: " .. tostring(read_err))
      client:close()
      return
    end
    
    if data then
      -- Process data
      local status, err = pcall(handle_client_data, client, client_state, data)
      if not status then
        print("[SERVER] Error handling client data: " .. tostring(err))
      end
    else
      -- EOF - client disconnected
      print("[SERVER] Client disconnected")
      
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
function server.start()
  print("[SERVER] Starting Neovim test server...")
  
  -- Create server socket
  server_socket = vim.loop.new_tcp()
  
  -- Bind to localhost:9999
  local status, err = pcall(function()
    server_socket:bind("127.0.0.1", 9999)
  end)
  
  if not status then
    print("[SERVER] Bind error: " .. tostring(err))
    return nil
  end
  
  -- Start listening
  status, err = pcall(function()
    server_socket:listen(128, function(listen_err)
      if listen_err then
        print("[SERVER] Listen error: " .. tostring(listen_err))
        return
      end
      
      -- Accept connections in a loop
      local function accept_next()
        server_socket:accept(function(accept_err, client)
          on_new_client(accept_err, client)
          vim.schedule(accept_next)
        end)
      end
      
      accept_next()
    end)
  end)
  
  if not status then
    print("[SERVER] Listen error: " .. tostring(err))
    return nil
  end
  
  print("[SERVER] Server listening on 127.0.0.1:9999")
  return server_socket
end

-- Stop the server
function server.stop()
  print("[SERVER] Stopping server...")
  
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
  
  print("[SERVER] Server stopped")
end

return server
