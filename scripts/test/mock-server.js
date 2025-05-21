/**
 * Robust mock server for integration tests
 * This server simulates Neovim server behavior for tests
 * Uses dynamic ports to avoid conflicts
 */
const net = require('net');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const portManager = require('../../test/utils/port-manager');

// Server configuration
const HOST = '127.0.0.1';
let PORT = null;
let serverInfo = null;
let isShuttingDown = false;

// Path to server information file
const SERVER_INFO_PATH = path.join(__dirname, '../../test/.server-info.json');

// Enable verbose mode if environment variable is set
const VERBOSE = process.env.VERBOSE_LOGS === 'true';

// Function to log with timestamp
const log = (message, isError = false) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  if (isError) {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }
};

// Storage for components and events
const components = new Map();
const events = [];

// Create TCP server
const server = net.createServer((socket) => {
  console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
  
  // Handle received data
  socket.on('data', (data) => {
    try {
      const command = JSON.parse(data.toString());
      console.log(`Command received: ${command.type} (ID: ${command.id})`);
      
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
              component.state.is_open = true;
              component.events.push({ type: 'select:opened', timestamp: Date.now() });
              events.push({ componentId: command.id, type: 'select:opened', timestamp: Date.now() });
              response.result = true;
              break;
              
            case 'close':
              component.state.is_open = false;
              component.events.push({ type: 'select:closed', timestamp: Date.now() });
              events.push({ componentId: command.id, type: 'select:closed', timestamp: Date.now() });
              response.result = true;
              break;
              
            case 'select_option':
              const index = command.args[0];
              if (component.state.options && component.state.options[index]) {
                component.state.selected_index = index;
                component.state.selected_value = component.state.options[index].value;
                component.state.selected_text = component.state.options[index].text;
                
                // Handle multi-select mode
                if (component.state.multi) {
                  component.state.selected_options = component.state.selected_options || [];
                  
                  // Check if option is already selected
                  const existingIndex = component.state.selected_options.findIndex(
                    opt => opt.value === component.state.options[index].value
                  );
                  
                  if (existingIndex >= 0) {
                    // Deselect option
                    component.state.selected_options.splice(existingIndex, 1);
                  } else {
                    // Select option
                    component.state.selected_options.push(component.state.options[index]);
                  }
                } else {
                  // In single-select mode, close menu after selection
                  component.state.is_open = false;
                }
                
                component.events.push({ 
                  type: 'select:option_selected', 
                  payload: {
                    index,
                    value: component.state.options[index].value,
                    text: component.state.options[index].text
                  },
                  timestamp: Date.now() 
                });
                
                events.push({ 
                  componentId: command.id, 
                  type: 'select:option_selected', 
                  payload: {
                    index,
                    value: component.state.options[index].value,
                    text: component.state.options[index].text
                  },
                  timestamp: Date.now() 
                });
              }
              response.result = true;
              break;
              
            case 'focus_option':
              const focusIndex = command.args[0];
              if (component.state.options && component.state.options[focusIndex]) {
                component.state.focused_index = focusIndex;
              }
              response.result = true;
              break;
              
            case 'focus_next_option':
              if (component.state.options) {
                const currentIndex = component.state.focused_index || 0;
                const nextIndex = Math.min(currentIndex + 1, component.state.options.length - 1);
                component.state.focused_index = nextIndex;
              }
              response.result = true;
              break;
              
            case 'focus_prev_option':
              if (component.state.options) {
                const currentIndex = component.state.focused_index || 0;
                const prevIndex = Math.max(currentIndex - 1, 0);
                component.state.focused_index = prevIndex;
              }
              response.result = true;
              break;
              
            case 'update_options':
              component.state.options = command.args[0];
              response.result = true;
              break;
              
            case 'set_disabled':
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
          response.error = `Command type not supported: ${command.type}`;
      }
      
      // Send response
      socket.write(JSON.stringify(response));
      console.log(`Response sent: ${response.success ? 'success' : 'failure'}`);
      
    } catch (err) {
      console.error(`Error processing command: ${err.message}`);
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
  
  // Handle errors
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

// Function to reset server state
const resetServer = () => {
  components.clear();
  events.length = 0;
  console.log('Server state reset');
};

// Function to start server with dynamic port
const startServer = async (port) => {
  try {
    // Check if a server is already running
    if (fs.existsSync(SERVER_INFO_PATH)) {
      try {
        const existingInfo = JSON.parse(fs.readFileSync(SERVER_INFO_PATH, 'utf8'));
        const existingPid = existingInfo.pid;
        
        // Check if process is still running
        try {
          process.kill(existingPid, 0); // Check if process exists without killing it
          log(`A mock server is already running with PID ${existingPid} on port ${existingInfo.port}`);
          
          // Try to kill existing process
          try {
            log(`Attempting to stop existing server (PID: ${existingPid})...`);
            process.kill(existingPid, 'SIGTERM');
            
            // Wait a bit to ensure process is terminated
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if process is still running
            try {
              process.kill(existingPid, 0);
              log(`Existing server could not be stopped gracefully, attempting force stop...`, true);
              process.kill(existingPid, 'SIGKILL');
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
              // Process was successfully stopped
              log(`Existing server stopped successfully`);
            }
          } catch (killErr) {
            log(`Error stopping existing server: ${killErr.message}`, true);
          }
        } catch (e) {
          // Process no longer exists but info file still does
          log(`Server info file exists but process ${existingPid} is no longer running`);
        }
      } catch (parseErr) {
        log(`Error reading server info file: ${parseErr.message}`, true);
      }
      
      // Delete existing info file
      try {
        fs.unlinkSync(SERVER_INFO_PATH);
        log(`Server info file deleted`);
      } catch (unlinkErr) {
        log(`Error deleting server info file: ${unlinkErr.message}`, true);
      }
    }
    
    // Allocate dynamic port
    PORT = await portManager.allocatePort('mock-server');
    log(`Port ${PORT} allocated for mock server`);
    
    // Start server
    server.listen(PORT, HOST, () => {
      log(`Mock server started on ${HOST}:${PORT}`);
      
      // Record server information
      serverInfo = {
        host: HOST,
        port: PORT,
        pid: process.pid,
        startTime: new Date().toISOString(),
        version: '1.0.0',
        components: 0,
        status: 'running'
      };
      
      // Write server information to file
      fs.writeFileSync(SERVER_INFO_PATH, JSON.stringify(serverInfo, null, 2));
      log(`Server information saved to ${SERVER_INFO_PATH}`);
      
      // Update server information periodically
      setInterval(updateServerInfo, 5000);
    });
  } catch (err) {
    log(`Error starting server: ${err.message}`, true);
    process.exit(1);
  }
};

// Function to update server information
const updateServerInfo = async () => {
  if (isShuttingDown) return;
  
  try {
    if (serverInfo) {
      serverInfo.components = components.size;
      serverInfo.lastUpdated = new Date().toISOString();
      serverInfo.uptime = Math.floor((Date.now() - new Date(serverInfo.startTime).getTime()) / 1000);
      
      fs.writeFileSync(SERVER_INFO_PATH, JSON.stringify(serverInfo, null, 2));
      if (VERBOSE) {
        log(`Server information updated (${components.size} active components)`);
      }
    }
  } catch (err) {
    log(`Error updating server information: ${err.message}`, true);
  }
};

// Start server
startServer();

// Function to gracefully stop server
const stopServer = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  log(`Received signal ${signal}, stopping mock server...`);
  
  // Update server status
  if (serverInfo) {
    serverInfo.status = 'shutting_down';
    try {
      fs.writeFileSync(SERVER_INFO_PATH, JSON.stringify(serverInfo, null, 2));
    } catch (err) {
      // Ignore errors when updating status
    }
  }
  
  // Close server
  server.close(() => {
    // Release port
    if (PORT) {
      portManager.releasePort(PORT);
      log(`Port ${PORT} released`);
    }
    
    // Delete server info file
    try {
      if (fs.existsSync(SERVER_INFO_PATH)) {
        fs.unlinkSync(SERVER_INFO_PATH);
        log(`Server info file deleted`);
      }
    } catch (err) {
      log(`Error deleting server info file: ${err.message}`, true);
    }
    
    log('Mock server stopped gracefully.');
    process.exit(0);
  });
  
  // Ensure process exits even if server.close() is blocked
  setTimeout(() => {
    log('Force stopping server after timeout...', true);
    process.exit(1);
  }, 5000);
};

// Handle exit signals
process.on('SIGINT', () => stopServer('SIGINT'));
process.on('SIGTERM', () => stopServer('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  log(`Unhandled error: ${err.message}`, true);
  stopServer('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled promise rejection:', true);
  log(reason instanceof Error ? reason.stack : String(reason), true);
  stopServer('unhandledRejection');
});

// Check server health
function checkServerHealth() {
  return {
    status: 'healthy',
    components: components.size,
    uptime: serverInfo ? Math.floor((Date.now() - new Date(serverInfo.startTime).getTime()) / 1000) : 0,
    port: PORT,
    host: HOST
  };
}

// Export API for tests
module.exports = {
  resetServer,
  getServerInfo: () => serverInfo,
  checkServerHealth
};

// Log startup message
log('Mock server starting...');
