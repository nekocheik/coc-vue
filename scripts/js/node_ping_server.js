#!/usr/bin/env node
// scripts/node_ping_server.js
// A minimal Node.js TCP server for ping-pong testing

const net = require('net');

// Create server
const server = net.createServer();
const PORT = 9999;

// Track active clients
const clients = new Map();
let nextClientId = 1;

// Handle new client connections
server.on('connection', (socket) => {
  const clientId = nextClientId++;
  const clientInfo = {
    id: clientId,
    socket: socket,
    buffer: '',
    address: `${socket.remoteAddress}:${socket.remotePort}`
  };
  
  clients.set(clientId, clientInfo);
  console.log(`[SERVER] Client ${clientId} connected from ${clientInfo.address}`);
  
  // Handle data from client
  socket.on('data', (data) => {
    const dataStr = data.toString();
    console.log(`[SERVER] Received data from client ${clientId} (${data.length} bytes): ${dataStr.replace(/\n/g, '\\n')}`);
    
    // Add to buffer
    clientInfo.buffer += dataStr;
    console.log(`[SERVER] Buffer for client ${clientId} (${clientInfo.buffer.length} bytes): ${clientInfo.buffer.substring(0, 50)}${clientInfo.buffer.length > 50 ? '...' : ''}`);
    
    // Process complete messages (separated by newlines)
    processBuffer(clientInfo);
  });
  
  // Handle client disconnection
  socket.on('close', () => {
    console.log(`[SERVER] Client ${clientId} disconnected`);
    clients.delete(clientId);
  });
  
  // Handle errors
  socket.on('error', (err) => {
    console.log(`[SERVER] Error with client ${clientId}: ${err.message}`);
    socket.destroy();
    clients.delete(clientId);
  });
});

// Process the client's buffer for complete messages
function processBuffer(clientInfo) {
  while (true) {
    const newlineIndex = clientInfo.buffer.indexOf('\n');
    if (newlineIndex === -1) break;
    
    // Extract message
    const message = clientInfo.buffer.substring(0, newlineIndex);
    clientInfo.buffer = clientInfo.buffer.substring(newlineIndex + 1);
    
    console.log(`[SERVER] Processing message from client ${clientInfo.id}: ${message}`);
    
    try {
      // Parse JSON
      const command = JSON.parse(message);
      
      // Handle ping command
      if (command.type === 'ping') {
        console.log(`[SERVER] Ping received from client ${clientInfo.id}, ID: ${command.id || 'unknown'}`);
        
        // Send pong response
        const response = {
          type: 'pong',
          id: command.id || ''
        };
        
        const responseStr = JSON.stringify(response) + '\n';
        console.log(`[SERVER] Sending to client ${clientInfo.id}: ${responseStr.replace(/\n/g, '\\n')}`);
        clientInfo.socket.write(responseStr);
      } else {
        console.log(`[SERVER] Unknown command type from client ${clientInfo.id}: ${command.type}`);
      }
    } catch (err) {
      console.log(`[SERVER] Error processing message from client ${clientInfo.id}: ${err.message}`);
    }
  }
}

// Start server
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[SERVER] Ping-pong server started on 127.0.0.1:${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error(`[SERVER] Server error: ${err.message}`);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('[SERVER] Shutting down server...');
  server.close(() => {
    console.log('[SERVER] Server stopped');
    process.exit(0);
  });
});

// If no clients connect within 60 seconds, exit
setTimeout(() => {
  if (clients.size === 0) {
    console.log('[SERVER] No clients connected after timeout, shutting down');
    process.exit(0);
  }
}, 60000);
