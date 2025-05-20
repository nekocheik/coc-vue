#!/usr/bin/env node
// scripts/test_server_connection.js
// Simple script to test connection to the Neovim server

const net = require('net');

// Create a client socket
const client = new net.Socket();
let connected = false;
let dataBuffer = '';
let pendingCommands = [];
let currentCommand = null;

// Function to send a command and wait for response
function sendCommand(command) {
  return new Promise((resolve, reject) => {
    const commandWithId = {
      ...command,
      id: 'test-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
    };
    
    console.log('\n📤 Sending command:', commandWithId.type);
    console.log(JSON.stringify(commandWithId, null, 2));
    
    // Add to pending commands
    pendingCommands.push({
      id: commandWithId.id,
      resolve,
      reject,
      command: commandWithId
    });
    
    // Send the command
    client.write(JSON.stringify(commandWithId) + '\n');
    
    // Set timeout for this command
    setTimeout(() => {
      const index = pendingCommands.findIndex(cmd => cmd.id === commandWithId.id);
      if (index !== -1) {
        const cmd = pendingCommands[index];
        pendingCommands.splice(index, 1);
        cmd.reject(new Error(`Command timed out: ${commandWithId.type}`));
      }
    }, 10000);
  });
}

// Connect to the server
client.connect(9999, '127.0.0.1', async () => {
  console.log('✅ Connected to Neovim test server');
  connected = true;
  
  try {
    // Test 1: Ping the server
    console.log('\n🧪 TEST 1: Ping the server');
    const pingResponse = await sendCommand({ type: 'ping' });
    console.log('✅ Ping successful:', pingResponse);
    
    // Test 2: Load a component
    console.log('\n🧪 TEST 2: Load a component');
    const loadResponse = await sendCommand({
      type: 'load_component',
      config: {
        id: 'test_component',
        title: 'Test Component',
        options: [
          { id: 'opt1', text: 'Option 1', value: 'value1' },
          { id: 'opt2', text: 'Option 2', value: 'value2' }
        ]
      }
    });
    console.log('✅ Component loaded:', loadResponse);
    const componentId = loadResponse.id;
    
    // Test 3: Get component state
    console.log('\n🧪 TEST 3: Get component state');
    const stateResponse = await sendCommand({
      type: 'get_state',
      id: componentId
    });
    console.log('✅ Component state retrieved:', stateResponse);
    
    // Test 4: Call a method on the component
    console.log('\n🧪 TEST 4: Call a method on the component');
    const methodResponse = await sendCommand({
      type: 'call_method',
      id: componentId,
      method: 'open',
      args: []
    });
    console.log('✅ Method called successfully:', methodResponse);
    
    // Test 5: Get events
    console.log('\n🧪 TEST 5: Get events');
    const eventsResponse = await sendCommand({
      type: 'get_events'
    });
    console.log('✅ Events retrieved:', eventsResponse);
    
    console.log('\n✅ All tests completed successfully!');
    
    // Shutdown the server
    console.log('\n🧪 Shutting down server...');
    await sendCommand({ type: 'shutdown' });
    
    // Close the connection
    client.end();
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    client.end();
  }
});

// Handle data from the server
client.on('data', (data) => {
  // Add to buffer
  dataBuffer += data.toString();
  
  // Try to parse complete JSON objects
  let jsonEndIndex;
  while ((jsonEndIndex = findJsonEnd(dataBuffer)) !== -1) {
    const jsonStr = dataBuffer.substring(0, jsonEndIndex + 1);
    dataBuffer = dataBuffer.substring(jsonEndIndex + 1);
    
    try {
      const response = JSON.parse(jsonStr);
      console.log('\n📥 Received response:', response.id);
      
      // Find the matching command
      const index = pendingCommands.findIndex(cmd => cmd.id === response.id);
      if (index !== -1) {
        const cmd = pendingCommands[index];
        pendingCommands.splice(index, 1);
        
        if (response.success) {
          cmd.resolve(response);
        } else {
          cmd.reject(new Error(response.error || 'Unknown error'));
        }
      } else {
        console.log('Received response for unknown command:', response);
      }
    } catch (err) {
      console.error('Error parsing response:', err);
      console.error('Invalid JSON:', jsonStr);
    }
  }
});

// Find the end of a complete JSON object
function findJsonEnd(str) {
  let braceCount = 0;
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
    } else if (char === '"') {
      inString = true;
    } else if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        return i;
      }
    }
  }
  
  return -1;
}

// Handle connection close
client.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});

// Handle errors
client.on('error', (err) => {
  console.error('Connection error:', err.message);
  if (!connected) {
    console.error('❌ Failed to connect to Neovim test server');
    console.error('Make sure the server is running with: nvim --headless -u scripts/test_init.vim');
  }
  process.exit(1);
});

// Set a timeout for initial connection
setTimeout(() => {
  if (!connected) {
    console.error('❌ Connection timeout');
    client.destroy();
    process.exit(1);
  }
}, 5000);
