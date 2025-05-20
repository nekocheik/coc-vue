#!/usr/bin/env node
// scripts/test_commands.js
// Test script for the command server

const net = require('net');
const assert = require('assert');

// Create a client socket
const client = new net.Socket();
let buffer = '';
let connected = false;
let testsPassed = 0;
let testsFailed = 0;
let testsTotal = 0;
let currentTest = null;
let testQueue = [];

// Log a message with timestamp
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[CLIENT ${timestamp}] ${message}`);
}

// Connect to the server with retry logic
function connectWithRetry(retries = 3, delay = 1000) {
  log(`Attempting to connect to 127.0.0.1:9999 (${retries} retries left)`);
  
  client.connect(9999, '127.0.0.1', () => {
    log('Connected to command server');
    connected = true;
    
    // Start running tests
    runNextTest();
  });
}

// Send a command to the server
function sendCommand(command) {
  const messageStr = JSON.stringify(command) + '\n';
  log(`Sending command (${messageStr.length} bytes): ${messageStr.replace(/\n/g, '\\n')}`);
  client.write(messageStr);
}

// Define test cases
const tests = [
  // Ping tests
  {
    name: 'Ping Test 1',
    command: { type: 'ping', id: 'ping-1' },
    expectedResponse: { type: 'pong', id: 'ping-1' },
    validate: (response, expected) => {
      assert.strictEqual(response.type, expected.type, 'Response type should be "pong"');
      assert.strictEqual(response.id, expected.id, 'Response ID should match command ID');
    }
  },
  {
    name: 'Ping Test 2',
    command: { type: 'ping', id: 'ping-2' },
    expectedResponse: { type: 'pong', id: 'ping-2' },
    validate: (response, expected) => {
      assert.strictEqual(response.type, expected.type, 'Response type should be "pong"');
      assert.strictEqual(response.id, expected.id, 'Response ID should match command ID');
    }
  },
  
  // Echo tests
  {
    name: 'Echo Test - Simple String',
    command: { type: 'echo', id: 'echo-1', data: 'Hello, world!' },
    expectedResponse: { type: 'echo', id: 'echo-1', data: 'Hello, world!' },
    validate: (response, expected) => {
      assert.strictEqual(response.type, expected.type, 'Response type should be "echo"');
      assert.strictEqual(response.id, expected.id, 'Response ID should match command ID');
      assert.strictEqual(response.data, expected.data, 'Response data should match command data');
    }
  },
  {
    name: 'Echo Test - Empty String',
    command: { type: 'echo', id: 'echo-2', data: '' },
    expectedResponse: { type: 'echo', id: 'echo-2', data: '' },
    validate: (response, expected) => {
      assert.strictEqual(response.type, expected.type, 'Response type should be "echo"');
      assert.strictEqual(response.id, expected.id, 'Response ID should match command ID');
      assert.strictEqual(response.data, expected.data, 'Response data should match command data');
    }
  },
  {
    name: 'Echo Test - Number',
    command: { type: 'echo', id: 'echo-3', data: 42 },
    expectedResponse: { type: 'echo', id: 'echo-3', data: 42 },
    validate: (response, expected) => {
      assert.strictEqual(response.type, expected.type, 'Response type should be "echo"');
      assert.strictEqual(response.id, expected.id, 'Response ID should match command ID');
      assert.strictEqual(response.data, expected.data, 'Response data should match command data');
    }
  },
  
  // Add tests
  {
    name: 'Add Test - Positive Numbers',
    command: { type: 'add', id: 'add-1', a: 2, b: 3 },
    expectedResponse: { type: 'result', id: 'add-1', result: 5 },
    validate: (response, expected) => {
      assert.strictEqual(response.type, expected.type, 'Response type should be "result"');
      assert.strictEqual(response.id, expected.id, 'Response ID should match command ID');
      assert.strictEqual(response.result, expected.result, 'Result should be the sum of a and b');
    }
  },
  {
    name: 'Add Test - Negative Numbers',
    command: { type: 'add', id: 'add-2', a: -5, b: 3 },
    expectedResponse: { type: 'result', id: 'add-2', result: -2 },
    validate: (response, expected) => {
      assert.strictEqual(response.type, expected.type, 'Response type should be "result"');
      assert.strictEqual(response.id, expected.id, 'Response ID should match command ID');
      assert.strictEqual(response.result, expected.result, 'Result should be the sum of a and b');
    }
  },
  {
    name: 'Add Test - Zero',
    command: { type: 'add', id: 'add-3', a: 0, b: 0 },
    expectedResponse: { type: 'result', id: 'add-3', result: 0 },
    validate: (response, expected) => {
      assert.strictEqual(response.type, expected.type, 'Response type should be "result"');
      assert.strictEqual(response.id, expected.id, 'Response ID should match command ID');
      assert.strictEqual(response.result, expected.result, 'Result should be the sum of a and b');
    }
  },
  {
    name: 'Add Test - Floating Point',
    command: { type: 'add', id: 'add-4', a: 1.5, b: 2.5 },
    expectedResponse: { type: 'result', id: 'add-4', result: 4 },
    validate: (response, expected) => {
      assert.strictEqual(response.type, expected.type, 'Response type should be "result"');
      assert.strictEqual(response.id, expected.id, 'Response ID should match command ID');
      assert.strictEqual(response.result, expected.result, 'Result should be the sum of a and b');
    }
  },
  
  // Repeat tests to ensure stability
  {
    name: 'Echo Test - Repeat',
    command: { type: 'echo', id: 'echo-repeat', data: 'Testing stability' },
    expectedResponse: { type: 'echo', id: 'echo-repeat', data: 'Testing stability' },
    validate: (response, expected) => {
      assert.strictEqual(response.type, expected.type, 'Response type should be "echo"');
      assert.strictEqual(response.id, expected.id, 'Response ID should match command ID');
      assert.strictEqual(response.data, expected.data, 'Response data should match command data');
    }
  },
  {
    name: 'Add Test - Repeat',
    command: { type: 'add', id: 'add-repeat', a: 10, b: 20 },
    expectedResponse: { type: 'result', id: 'add-repeat', result: 30 },
    validate: (response, expected) => {
      assert.strictEqual(response.type, expected.type, 'Response type should be "result"');
      assert.strictEqual(response.id, expected.id, 'Response ID should match command ID');
      assert.strictEqual(response.result, expected.result, 'Result should be the sum of a and b');
    }
  }
];

// Run the next test in the queue
function runNextTest() {
  if (testQueue.length === 0) {
    // All tests completed
    log(`All tests completed: ${testsPassed} passed, ${testsFailed} failed, ${testsTotal} total`);
    
    if (testsFailed === 0) {
      log('✅ ALL TESTS PASSED');
      log('Node <-> NeoVim/Lua communication is stable, generic command processing operational. Ready to connect real components.');
      client.end();
      process.exit(0);
    } else {
      log('❌ SOME TESTS FAILED');
      client.end();
      process.exit(1);
    }
    return;
  }
  
  currentTest = testQueue.shift();
  testsTotal++;
  
  log(`Running test: ${currentTest.name}`);
  sendCommand(currentTest.command);
  
  // Set a timeout for this test
  currentTest.timeout = setTimeout(() => {
    log(`❌ Test "${currentTest.name}" timed out`);
    testsFailed++;
    runNextTest();
  }, 5000);
}

// Handle data from the server
client.on('data', (data) => {
  log(`Received data: ${data.length} bytes`);
  log(`Raw data: ${data.toString().replace(/\n/g, '\\n')}`);
  
  // Add received data to buffer
  buffer += data.toString();
  log(`Buffer now (${buffer.length} bytes): ${buffer.substring(0, 50)}${buffer.length > 50 ? '...' : ''}`);
  
  // Process complete messages (separated by newlines)
  let newlineIndex;
  while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
    log(`Found newline at position ${newlineIndex}`);
    const message = buffer.substring(0, newlineIndex);
    buffer = buffer.substring(newlineIndex + 1);
    log(`Extracted message: ${message}`);
    
    try {
      const response = JSON.parse(message);
      log(`Received response: ${JSON.stringify(response)}`);
      
      // Check if we have a current test
      if (currentTest) {
        clearTimeout(currentTest.timeout);
        
        try {
          // Validate the response
          currentTest.validate(response, currentTest.expectedResponse);
          log(`✅ Test "${currentTest.name}" passed`);
          testsPassed++;
        } catch (validationError) {
          log(`❌ Test "${currentTest.name}" failed: ${validationError.message}`);
          log(`Expected: ${JSON.stringify(currentTest.expectedResponse)}`);
          log(`Actual: ${JSON.stringify(response)}`);
          testsFailed++;
        }
        
        // Move to the next test
        runNextTest();
      } else {
        log('Received response but no test is currently running');
      }
    } catch (err) {
      log(`Error parsing response: ${err.message}`);
      log(`Raw message: ${message}`);
      
      if (currentTest) {
        clearTimeout(currentTest.timeout);
        log(`❌ Test "${currentTest.name}" failed: Could not parse response`);
        testsFailed++;
        runNextTest();
      }
    }
  }
});

// Handle connection errors
client.on('error', (err) => {
  if (!connected && err.code === 'ECONNREFUSED') {
    log('Connection refused, server might not be ready yet');
    if (retries > 0) {
      setTimeout(() => {
        connectWithRetry(retries - 1, delay);
      }, delay);
    } else {
      log('Could not connect to server after multiple attempts');
      process.exit(1);
    }
  } else {
    log(`Connection error: ${err.message}`);
    process.exit(1);
  }
});

// Handle connection close
client.on('close', () => {
  log('Connection closed');
  if (testQueue.length > 0 || currentTest) {
    log('Connection closed before all tests completed');
    process.exit(1);
  }
});

// Initialize test queue
testQueue = [...tests];

// Start the connection process
connectWithRetry();

// Set a global timeout
setTimeout(() => {
  log('Test timeout - exiting');
  log(`Tests completed: ${testsPassed} passed, ${testsFailed} failed, ${testsTotal} total`);
  process.exit(1);
}, 30000);
