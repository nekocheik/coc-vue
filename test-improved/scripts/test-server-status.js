/**
 * Script to check test server availability
 * Connects to the test server and sends a ping command
 * to verify it is operational
 */
const net = require('net');

// Function to check if server is accessible and responds correctly
function checkServer() {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let responseReceived = false;
    
    // Set connection timeout
    socket.setTimeout(2000);
    
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Timeout when trying to connect to server'));
    });
    
    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });
    
    socket.on('connect', () => {
      console.log('Connected to server, sending ping command...');
      
      // Send ping command
      const pingCommand = {
        id: `ping_${Date.now()}`,
        type: 'ping'
      };
      
      socket.write(JSON.stringify(pingCommand));
      
      // Wait for response for maximum 2 seconds
      setTimeout(() => {
        if (!responseReceived) {
          socket.destroy();
          reject(new Error('No response from server after sending ping command'));
        }
      }, 2000);
    });
    
    socket.on('data', (data) => {
      try {
        const response = JSON.parse(data.toString());
        responseReceived = true;
        
        if (response.success && response.message === 'pong') {
          console.log('Server operational (pong response received)');
          socket.end();
          resolve(true);
        } else {
          console.log('Invalid server response:', response);
          socket.end();
          reject(new Error('Invalid server response'));
        }
      } catch (err) {
        console.error('Error while processing response:', err);
        socket.destroy();
        reject(err);
      }
    });
    
    // Connect to server
    socket.connect(9999, '127.0.0.1');
  });
}

// Run verification
checkServer()
  .then(() => {
    console.log('Server is operational');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error while checking server:', err.message);
    process.exit(1);
  });
