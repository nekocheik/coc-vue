/**
 * Mock server for integration tests
 * This server simulates Neovim server behavior for tests
 */
const net = require('net');

// Server configuration
const PORT = 9999;
const HOST = '127.0.0.1';

// Storage for components and events
const components = new Map();
let events = [];

// Create TCP server
const server = net.createServer((socket) => {
  console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
  
  // Handle received data
  socket.on('data', (data) => {
    try {
      const command = JSON.parse(data.toString());
      console.log(`Received command: ${command.type} (ID: ${command.id})`);
      
      // Process command
      let response = {
        id: command.id,
        success: true
      };
      
      switch (command.type) {
        case 'ping':
          response.message = 'pong';
          break;
          
        case 'load_component':
          const componentId = command.config.id || `component_${Date.now()}`;
          components.set(componentId, {
            id: componentId,
            config: command.config,
            state: { ...command.config },
            events: []
          });
          response.id = componentId;
          break;
          
        case 'call_method':
          const component = components.get(command.id);
          if (!component) {
            response.success = false;
            response.error = `Component not found: ${command.id}`;
            break;
          }
          
          // Simulate different methods
          switch (command.method) {
            case 'mount':
              component.state.mounted = true;
              response.result = true;
              break;
              
            case 'unmount':
              component.state.mounted = false;
              response.result = true;
              break;
              
            case 'open':
              component.state.isOpen = true;
              component.events.push({ type: 'open', timestamp: Date.now() });
              events.push({ componentId: command.id, type: 'open', timestamp: Date.now() });
              response.result = true;
              break;
              
            case 'close':
              component.state.isOpen = false;
              component.events.push({ type: 'close', timestamp: Date.now() });
              events.push({ componentId: command.id, type: 'close', timestamp: Date.now() });
              response.result = true;
              break;
              
            case 'select':
              const index = command.args[0];
              if (component.state.options && component.state.options[index]) {
                component.state.selectedIndex = index;
                component.state.selectedOption = component.state.options[index];
                component.events.push({ 
                  type: 'select', 
                  value: component.state.options[index],
                  timestamp: Date.now() 
                });
                events.push({ 
                  componentId: command.id, 
                  type: 'select', 
                  value: component.state.options[index],
                  timestamp: Date.now() 
                });
              }
              response.result = true;
              break;
              
            case 'updateOptions':
              component.state.options = command.args[0];
              response.result = true;
              break;
              
            case 'setDisabled':
              component.state.disabled = command.args[0];
              response.result = true;
              break;
              
            default:
              response.success = false;
              response.error = `Method not supported: ${command.method}`;
          }
          break;
          
        case 'get_state':
          const comp = components.get(command.id);
          if (!comp) {
            response.success = false;
            response.error = `Component not found: ${command.id}`;
            break;
          }
          response.state = comp.state;
          break;
          
        case 'get_events':
          response.events = events;
          break;
          
        default:
          response.success = false;
          response.error = `Unsupported command type: ${command.type}`;
      }
      
      // Send response
      socket.write(JSON.stringify(response));
      console.log(`Response sent: ${response.success ? 'success' : 'failure'}`);
      
    } catch (err) {
      console.error(`Error while processing command: ${err.message}`);
      socket.write(JSON.stringify({
        id: 'error',
        success: false,
        error: err.message
      }));
    }
  });
  
  // Handle disconnection
  socket.on('close', () => {
    console.log(`Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
  });
  
  // Handle socket errors
  socket.on('error', (err) => {
    console.error(`Socket error: ${err.message}`);
  });
});

// Handle server errors
server.on('error', (err) => {
  console.error(`Server error: ${err.message}`);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop any existing process on this port.`);
    process.exit(1);
  }
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`Mock server started on ${HOST}:${PORT}`);
});

// Handle clean exit
process.on('SIGINT', () => {
  console.log('Stopping mock server...');
  server.close(() => {
    console.log('Mock server stopped.');
    process.exit(0);
  });
});

// Keep server alive
console.log('Mock server waiting for connections...');
