#!/usr/bin/env lua
-- simple_ping_server.lua
-- A minimal standalone Lua TCP server for ping-pong testing

local socket = require("socket")

-- Create server socket
local server = assert(socket.bind("127.0.0.1", 9999))
server:settimeout(0.1)  -- Non-blocking with short timeout

print("[SERVER] Ping-pong server started on 127.0.0.1:9999")

-- Track active clients
local clients = {}
local client_buffers = {}
local next_client_id = 1

-- Main server loop
while true do
    -- Accept new connections
    local client, err = server:accept()
    if client then
        local client_id = next_client_id
        next_client_id = next_client_id + 1
        
        client:settimeout(0)  -- Non-blocking
        clients[client_id] = client
        client_buffers[client_id] = ""
        
        local ip, port = client:getpeername()
        print(string.format("[SERVER] Client %d connected from %s:%s", client_id, ip, port))
    end
    
    -- Process data from all clients
    for id, client in pairs(clients) do
        local data, err, partial = client:receive(1024)
        
        -- Handle received data
        if data then
            client_buffers[id] = client_buffers[id] .. data
            print(string.format("[SERVER] Received data from client %d: %s", id, data:gsub("\n", "\\n")))
        elseif partial and #partial > 0 then
            client_buffers[id] = client_buffers[id] .. partial
            print(string.format("[SERVER] Received partial data from client %d: %s", id, partial:gsub("\n", "\\n")))
        end
        
        -- Process complete messages (separated by newlines)
        local buffer = client_buffers[id]
        while true do
            local newline_pos = buffer:find("\n")
            if not newline_pos then break end
            
            local message = buffer:sub(1, newline_pos - 1)
            buffer = buffer:sub(newline_pos + 1)
            
            print(string.format("[SERVER] Processing message from client %d: %s", id, message))
            
            -- Simple JSON parsing
            local msg_type = message:match('"type":"([^"]+)"')
            local msg_id = message:match('"id":"([^"]+)"')
            
            if msg_type == "ping" then
                print(string.format("[SERVER] Ping received from client %d, ID: %s", id, msg_id or "unknown"))
                
                -- Send pong response
                local response = string.format('{"type":"pong","id":"%s"}\n', msg_id or "")
                print(string.format("[SERVER] Sending to client %d: %s", id, response:gsub("\n", "\\n")))
                client:send(response)
            else
                print(string.format("[SERVER] Unknown message type from client %d: %s", id, msg_type or "nil"))
            end
        end
        
        client_buffers[id] = buffer
        
        -- Check if client disconnected
        if err == "closed" then
            print(string.format("[SERVER] Client %d disconnected", id))
            client:close()
            clients[id] = nil
            client_buffers[id] = nil
        end
    end
    
    -- Small sleep to prevent CPU hogging
    socket.sleep(0.01)
end
