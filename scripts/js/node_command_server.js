#!/usr/bin/env node
// scripts/node_command_server.js
// A Node.js TCP server for handling commands from clients

const net = require('net');
const fs = require('fs');

// Create server
const server = net.createServer();
const PORT = 9999;
const HOST = '127.0.0.1';

// Set up logging
const LOG_FILE = 'command_server.log';
let logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

// Log a message with timestamp
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[SERVER ${timestamp}] ${message}`;
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

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
  log(`Client ${clientId} connected from ${clientInfo.address}`);
  
  // Handle data from client
  socket.on('data', (data) => {
    const dataStr = data.toString();
    log(`Received data from client ${clientId} (${data.length} bytes): ${dataStr.replace(/\n/g, '\\n')}`);
    
    // Add to buffer
    clientInfo.buffer += dataStr;
    log(`Buffer for client ${clientId} (${clientInfo.buffer.length} bytes): ${clientInfo.buffer.substring(0, 50)}${clientInfo.buffer.length > 50 ? '...' : ''}`);
    
    // Process complete messages (separated by newlines)
    processBuffer(clientInfo);
  });
  
  // Handle client disconnection
  socket.on('close', () => {
    log(`Client ${clientId} disconnected`);
    clients.delete(clientId);
  });
  
  // Handle errors
  socket.on('error', (err) => {
    log(`Error with client ${clientId}: ${err.message}`);
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
    
    log(`Processing message from client ${clientInfo.id}: ${message}`);
    
    try {
      // Parse JSON
      const command = JSON.parse(message);
      
      // Log the received command
      log(`Command received: ${JSON.stringify(command)}`);
      
      // Process the command
      processCommand(clientInfo, command);
    } catch (err) {
      log(`Error processing message from client ${clientInfo.id}: ${err.message}`);
      log(`Raw message: ${message}`);
      
      // Send error response
      sendResponse(clientInfo, {
        type: 'error',
        error: `Invalid JSON format: ${err.message}`,
        id: null
      });
    }
  }
}

// Process a command
function processCommand(clientInfo, command) {
  // Validate command structure
  if (typeof command !== 'object' || command === null) {
    log(`Invalid command format: not an object`);
    sendResponse(clientInfo, {
      type: 'error',
      error: 'Invalid command format',
      id: null
    });
    return;
  }
  
  // Extract command type and ID
  const cmdType = command.type;
  const cmdId = command.id;
  
  if (!cmdType) {
    log(`Invalid command: missing type field`);
    sendResponse(clientInfo, {
      type: 'error',
      error: 'Missing command type',
      id: cmdId
    });
    return;
  }
  
  // Handle different command types
  try {
    switch (cmdType) {
      case 'ping':
        // Ping command
        sendResponse(clientInfo, {
          type: 'pong',
          id: cmdId
        });
        break;
        
      case 'echo':
        // Echo command
        if (!('data' in command)) {
          log(`Invalid echo command: missing data field`);
          sendResponse(clientInfo, {
            type: 'error',
            error: 'Missing data field for echo command',
            id: cmdId
          });
          return;
        }
        
        sendResponse(clientInfo, {
          type: 'echo',
          id: cmdId,
          data: command.data
        });
        break;
        
      case 'add':
        // Add command
        const a = command.a;
        const b = command.b;
        
        if (typeof a !== 'number' || typeof b !== 'number') {
          log(`Invalid add command: a and b must be numbers`);
          sendResponse(clientInfo, {
            type: 'error',
            error: 'Parameters a and b must be numbers',
            id: cmdId
          });
          return;
        }
        
        const result = a + b;
        sendResponse(clientInfo, {
          type: 'result',
          id: cmdId,
          result: result
        });
        break;
        
      default:
        // Unknown command
        log(`Unknown command type: ${cmdType}`);
        sendResponse(clientInfo, {
          type: 'error',
          error: `Unknown command type: ${cmdType}`,
          id: cmdId
        });
    }
  } catch (err) {
    log(`Error processing command: ${err.message}`);
    log(`Command: ${JSON.stringify(command)}`);
    
    sendResponse(clientInfo, {
      type: 'error',
      error: `Internal server error: ${err.message}`,
      id: cmdId
    });
  }
}

// Send a response to the client
function sendResponse(clientInfo, response) {
  // Add newline to ensure message boundary
  const responseStr = JSON.stringify(response) + '\n';
  
  // Log the response
  log(`Sending response to client ${clientInfo.id}: ${responseStr.replace(/\n/g, '\\n')}`);
  
  // Send the response
  clientInfo.socket.write(responseStr, (err) => {
    if (err) {
      log(`Error sending response to client ${clientInfo.id}: ${err.message}`);
    }
  });
}

// Start server
server.listen(PORT, HOST, () => {
  log(`Command server started on ${HOST}:${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
  log(`Server error: ${err.message}`);
  
  if (err.code === 'EADDRINUSE') {
    log(`Port ${PORT} is already in use. Please close the other application using this port.`);
  }
  
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  log('Shutting down server...');
  server.close(() => {
    log('Server stopped');
    logStream.end();
    process.exit(0);
  });
});

// If no clients connect within 60 seconds, exit
setTimeout(() => {
  if (clients.size === 0) {
    log('No clients connected after timeout, shutting down');
    server.close(() => {
      logStream.end();
      process.exit(0);
    });
  }
}, 60000);
