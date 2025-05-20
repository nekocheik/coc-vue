#!/usr/bin/env node
// scripts/ping_test.js
// Simple ping-pong test client for the Neovim TCP server

const net = require('net');

// Create a client socket
const client = new net.Socket();
let buffer = '';
let connected = false;
let pingsSent = 0;
let pongsReceived = 0;

// Connect to the server with retry logic
function connectWithRetry(retries = 3, delay = 1000) {
  console.log(`[CLIENT] Attempting to connect to 127.0.0.1:9999 (${retries} retries left)`);
  
  client.connect(9999, '127.0.0.1', () => {
    console.log('[CLIENT] Connected to Neovim test server');
    connected = true;
    
    // Send a ping command
    sendPing();
    
    // Send 5 more pings with 500ms interval
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (count >= 5) {
        clearInterval(interval);
        console.log('[CLIENT] All ping tests completed');
        console.log(`[CLIENT] Summary: ${pingsSent} pings sent, ${pongsReceived} pongs received`);
        
        // Exit with success if we received at least one pong
        if (pongsReceived > 0) {
          console.log('[CLIENT] ✅ Test PASSED - received at least one pong response');
          setTimeout(() => {
            client.end();
            process.exit(0); // Success exit code
          }, 1000);
        } else {
          console.log('[CLIENT] ❌ Test FAILED - no pong responses received');
          setTimeout(() => {
            client.end();
            process.exit(1); // Failure exit code
          }, 1000);
        }
        return;
      }
      sendPing();
    }, 500);
  });
}

// Start the connection process
connectWithRetry();

// Handle connection errors
client.on('error', (err) => {
  if (!connected && err.code === 'ECONNREFUSED') {
    console.log('[CLIENT] Connection refused, server might not be ready yet');
    setTimeout(() => {
      connectWithRetry();
    }, 1000);
  } else {
    console.error(`[CLIENT] Connection error: ${err.message}`);
    process.exit(1);
  }
});

// Send a ping message
function sendPing() {
  const pingId = 'ping-' + Date.now();
  const message = {
    type: 'ping',
    id: pingId,
    timestamp: Date.now()
  };
  
  const messageStr = JSON.stringify(message) + '\n';
  console.log(`[CLIENT] Sending ping (ID: ${pingId}, ${messageStr.length} bytes)`);
  console.log(`[CLIENT] Raw message: ${messageStr.replace(/\n/g, '\\n')}`);
  client.write(messageStr);
  
  // Increment ping counter
  pingsSent++;
}

// Handle data from the server
client.on('data', (data) => {
  console.log(`[CLIENT] Received data: ${data.length} bytes`);
  console.log(`[CLIENT] Raw data: ${data.toString().replace(/\n/g, '\\n')}`);
  
  // Add received data to buffer
  buffer += data.toString();
  console.log(`[CLIENT] Buffer now (${buffer.length} bytes): ${buffer.substring(0, 50)}${buffer.length > 50 ? '...' : ''}`);
  
  // Process complete messages (separated by newlines)
  let newlineIndex;
  while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
    console.log(`[CLIENT] Found newline at position ${newlineIndex}`);
    const message = buffer.substring(0, newlineIndex);
    buffer = buffer.substring(newlineIndex + 1);
    console.log(`[CLIENT] Extracted message: ${message}`);
    
    try {
      const response = JSON.parse(message);
      console.log(`[CLIENT] Received: ${JSON.stringify(response)}`);
      
      if (response.type === 'pong') {
        console.log(`[CLIENT] ✅ Pong received for ID: ${response.id}`);
        pongsReceived++;
      } else {
        console.log(`[CLIENT] ❌ Unexpected response type: ${response.type}`);
      }
    } catch (err) {
      console.error(`[CLIENT] Error parsing response: ${err.message}`);
      console.error(`[CLIENT] Raw message: ${message}`);
    }
  }
});

// Handle connection close
client.on('close', () => {
  console.log('[CLIENT] Connection closed');
  process.exit(0);
});

// Handle errors
client.on('error', (err) => {
  console.error(`[CLIENT] Connection error: ${err.message}`);
  process.exit(1);
});

// Set a timeout
setTimeout(() => {
  console.error('[CLIENT] Test timeout - exiting');
  console.error(`[CLIENT] Final buffer state (${buffer.length} bytes): ${buffer.replace(/\n/g, '\\n')}`);
  client.destroy();
  process.exit(1);
}, 10000);
