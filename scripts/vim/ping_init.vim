" ping_init.vim - Minimal init file for ping-pong test
set nocompatible
set hidden
filetype plugin indent on
syntax enable

" Add the project root to the runtime path
let s:project_root = expand('<sfile>:p:h:h:h')
let &runtimepath.=','.s:project_root

" Embed the ping-pong server directly
lua << EOF
-- Minimal TCP server for ping-pong protocol
local active_clients = {}
local server_socket = nil

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
    -- Simple JSON encoding for the response
    if response.type == "pong" then
      json_response = '{"type":"pong","id":"' .. (response.id or "") .. '"}\n'
    else
      json_response = '{"type":"error","error":"' .. (response.error or "Unknown error") .. '"}\n'
    end
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
  print("[SERVER] Processing message (" .. #message_str .. " bytes): " .. message_str:sub(1, 100) .. (message_str:len() > 100 and "..." or ""))
  
  -- Simple JSON parsing for ping messages
  local id = message_str:match('"id":"([^"]+)"')
  local msg_type = message_str:match('"type":"([^"]+)"')
  
  if not msg_type then
    print("[SERVER] Invalid message format - no type field")
    send_response(client, {type = "error", error = "Invalid message format"})
    return
  end
  
  print("[SERVER] Received command: " .. msg_type .. ", ID: " .. (id or "<no id>"))
  
  -- Handle ping command
  if msg_type == "ping" then
    local response = {type = "pong"}
    if id then
      response.id = id
    end
    send_response(client, response)
    return
  end
  
  -- Unknown command
  send_response(client, {type = "error", error = "Unknown command", id = id})
end

-- Handle client data
local function handle_client_data(client, client_state, data)
  if not data then return end
  
  -- Add data to buffer
  client_state.buffer = client_state.buffer .. data
  print("[SERVER] Received data (" .. #data .. " bytes): " .. data:gsub("\n", "\\n"))
  print("[SERVER] Buffer now (" .. #client_state.buffer .. " bytes): " .. client_state.buffer:sub(1, 50) .. 
        (client_state.buffer:len() > 50 and "..." or ""))
  
  -- Process complete messages (separated by newlines)
  while true do
    local newline_pos = string.find(client_state.buffer, "\n")
    if not newline_pos then 
      print("[SERVER] No complete message found in buffer, waiting for more data")
      break 
    end
    
    print("[SERVER] Found newline at position " .. newline_pos)
    local message = string.sub(client_state.buffer, 1, newline_pos - 1)
    client_state.buffer = string.sub(client_state.buffer, newline_pos + 1)
    print("[SERVER] Extracted message: " .. message)
    
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
  
  print("[SERVER] Client connected from " .. client:getpeername().ip .. ":" .. client:getpeername().port)
  
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
local function start_server()
  print("[SERVER] Starting ping-pong server...")
  
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
      
      print("[SERVER] Listen callback triggered, starting to accept connections")
      
      -- Accept connections directly
      server_socket:accept(on_new_client)
      
      -- Set up a timer to periodically check for new connections
      local timer = vim.loop.new_timer()
      timer:start(100, 100, function()
        if server_socket and not server_socket:is_closing() then
          server_socket:accept(on_new_client)
        end
      end)
      
      print("[SERVER] Acceptance loop started")
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
function _G.stop_server()
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

-- Start the server
start_server()

-- Print debug info
print("Lua version: " .. _VERSION)
print("Ping server started successfully")

-- Register a function to stop the server on exit
vim.cmd([[
  augroup PingServer
    autocmd!
    autocmd VimLeave * lua stop_server()
  augroup END
]])
EOF

" Keep Neovim running
autocmd VimEnter * echom "Ping server initialized and running."
