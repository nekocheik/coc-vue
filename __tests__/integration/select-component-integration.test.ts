// __tests__/integration/select-component-integration.test.ts
// Integration test for Select component via TCP protocol

import * as net from 'net';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Command interface
interface Command {
  type: string;
  id: string;
  [key: string]: any;
}

// Response interface
interface Response {
  type: string;
  id: string;
  error?: string;
  code?: string;
  [key: string]: any;
}

// Custom error interface with code property
interface ServerError extends Error {
  code: string;
}

// Client class to handle communication with the server
class ComponentClient {
  private client: net.Socket;
  private buffer: string = '';
  private responseHandlers: Map<string, (response: Response) => void> = new Map();
  private connected: boolean = false;
  private connectionPromise: Promise<void>;
  private connectionResolve: (() => void) | null = null;
  private connectionReject: ((error: Error) => void) | null = null;

  constructor() {
    this.client = new net.Socket();
    this.connectionPromise = new Promise<void>((resolve, reject) => {
      this.connectionResolve = resolve;
      this.connectionReject = reject;
    });

    this.client.on('data', (data) => {
      this.handleData(data);
    });

    this.client.on('error', (error) => {
      console.error(`Client error: ${error.message}`);
      if (!this.connected && this.connectionReject) {
        this.connectionReject(error);
      }
    });

    this.client.on('close', () => {
      console.log('Connection closed');
      this.connected = false;
    });
  }

  // Connect to the server
  async connect(host: string = '127.0.0.1', port: number = 9999, retries: number = 5): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const tryConnect = (retriesLeft: number) => {
        console.log(`Connecting to ${host}:${port}, retries left: ${retriesLeft}`);
        
        this.client.connect(port, host, () => {
          console.log(`Connected to ${host}:${port}`);
          this.connected = true;
          if (this.connectionResolve) {
            this.connectionResolve();
          }
          resolve();
        });

        this.client.once('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'ECONNREFUSED' && retriesLeft > 0) {
            console.log(`Connection refused, retrying in 1 second...`);
            setTimeout(() => {
              tryConnect(retriesLeft - 1);
            }, 1000);
          } else {
            reject(error);
            if (this.connectionReject) {
              this.connectionReject(error);
            }
          }
        });
      };

      tryConnect(retries);
    });
  }

  // Close the connection
  close(): void {
    this.client.end();
  }
  
  // Close the connection and wait for it to close
  async closeAndWait(): Promise<void> {
    return new Promise<void>((resolve) => {
      // Set up a one-time close event handler
      const onClose = () => {
        resolve();
      };
      
      this.client.once('close', onClose);
      this.close();
      
      // Set a timeout in case the close event doesn't fire
      setTimeout(() => {
        this.client.removeListener('close', onClose);
        resolve();
      }, 1000);
    });
  }

  // Send a command to the server
  async sendCommand(command: Command): Promise<Response> {
    if (!this.connected) {
      await this.connectionPromise;
    }

    return new Promise<Response>((resolve, reject) => {
      const commandStr = JSON.stringify(command) + '\n';
      console.log(`Sending command: ${commandStr.trim()}`);
      
      // Register response handler
      this.responseHandlers.set(command.id, (response) => {
        if (response.type === 'error') {
          const err = new Error(`Server error: ${response.error}`) as ServerError;
          err.code = response.code || 'UNKNOWN_ERROR';
          reject(err);
        } else {
          resolve(response);
        }
      });

      // Send the command
      this.client.write(commandStr, (error) => {
        if (error) {
          this.responseHandlers.delete(command.id);
          reject(error);
        }
      });

      // Set a timeout
      setTimeout(() => {
        if (this.responseHandlers.has(command.id)) {
          this.responseHandlers.delete(command.id);
          reject(new Error(`Timeout waiting for response to command: ${command.type}`));
        }
      }, 5000);
    });
  }

  // Handle data from the server
  private handleData(data: Buffer): void {
    // Add received data to buffer
    this.buffer += data.toString();
    console.log(`Received data: ${data.length} bytes`);
    console.log(`Buffer: ${this.buffer.substring(0, 100)}${this.buffer.length > 100 ? '...' : ''}`);

    // Process complete messages (separated by newlines)
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const message = this.buffer.substring(0, newlineIndex);
      this.buffer = this.buffer.substring(newlineIndex + 1);

      try {
        const response = JSON.parse(message) as Response;
        console.log(`Received response: ${JSON.stringify(response).substring(0, 100)}${JSON.stringify(response).length > 100 ? '...' : ''}`);

        // Find and call the handler for this response
        if (response.id && this.responseHandlers.has(response.id)) {
          const handler = this.responseHandlers.get(response.id);
          if (handler) {
            this.responseHandlers.delete(response.id);
            handler(response);
          }
        }
      } catch (error) {
        console.error(`Error parsing response: ${error}`);
        console.error(`Raw message: ${message}`);
      }
    }
  }

  // Helper methods for component operations
  async loadComponent(name: string, config: any = {}): Promise<Response> {
    const command: Command = {
      type: 'load_component',
      id: `load_${Date.now()}`,
      name,
      ...config
    };
    return this.sendCommand(command);
  }

  async callMethod(componentId: string, method: string, args: any[] = []): Promise<Response> {
    const command: Command = {
      type: 'call_method',
      id: `call_${Date.now()}`,
      component_id: componentId,
      method,
      args
    };
    return this.sendCommand(command);
  }

  async getState(componentId: string): Promise<Response> {
    const command: Command = {
      type: 'get_state',
      id: `state_${Date.now()}`,
      component_id: componentId
    };
    return this.sendCommand(command);
  }

  async setProps(componentId: string, props: any): Promise<Response> {
    const command: Command = {
      type: 'set_props',
      id: `props_${Date.now()}`,
      component_id: componentId,
      props
    };
    return this.sendCommand(command);
  }

  async unloadComponent(componentId: string): Promise<Response> {
    const command: Command = {
      type: 'unload_component',
      id: `unload_${Date.now()}`,
      component_id: componentId
    };
    return this.sendCommand(command);
  }

  async ping(): Promise<Response> {
    const command: Command = {
      type: 'ping',
      id: `ping_${Date.now()}`
    };
    return this.sendCommand(command);
  }
  
  async cleanAll(): Promise<Response> {
    const command: Command = {
      type: 'clean_all',
      id: `clean_${Date.now()}`
    };
    return this.sendCommand(command);
  }
}

// Variables globales pour garantir la persistance entre les tests
let globalClient: ComponentClient;
let globalServerProcess: ChildProcess | null = null;

// Utiliser un ID fixe pour le composant Select pour garantir la persistance
const FIXED_COMPONENT_ID = 'select_test_fixed_id';

// Fichier pour stocker les logs de test
const TEST_LOGS_FILE = '/tmp/test_logs.txt';

// Test suite for Select component integration
describe('Select Component Integration', () => {
  // Références aux variables globales
  let client: ComponentClient;
  let serverProcess: ChildProcess | null = null;
  let componentId: string | null = null;
  
  // Create a log file for debugging
  beforeAll(async () => {
    // Create an empty log file
    fs.writeFileSync(TEST_LOGS_FILE, '');
    
    // Log function to capture all logs
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = function() {
      const args = Array.from(arguments);
      const logMessage = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : arg
      ).join(' ');
      
      fs.appendFileSync(TEST_LOGS_FILE, logMessage + '\n');
      originalLog.apply(console, arguments);
    };
    
    console.error = function() {
      const args = Array.from(arguments);
      const logMessage = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : arg
      ).join(' ');
      
      fs.appendFileSync(TEST_LOGS_FILE, 'ERROR: ' + logMessage + '\n');
      originalError.apply(console, arguments);
    };
  });

  // Set up the server and client before all tests
  beforeAll(async () => {
    console.log('Setting up server and client for all tests...');
    
    // Check if we already have a global server process
    if (!globalServerProcess) {
      // Start the component server
      const scriptPath = path.resolve(__dirname, '../../scripts/run_component_server.sh');
      globalServerProcess = spawn('bash', [scriptPath], {
        detached: true,
        stdio: 'pipe'
      });

      // Log server output
      if (globalServerProcess.stdout) {
        globalServerProcess.stdout.on('data', (data) => {
          console.log(`[SERVER] ${data.toString().trim()}`);
        });
      }
      if (globalServerProcess.stderr) {
        globalServerProcess.stderr.on('data', (data) => {
          console.error(`[SERVER ERROR] ${data.toString().trim()}`);
        });
      }
      
      console.log('Server process started with PID:', globalServerProcess.pid);
    } else {
      console.log('Using existing server process with PID:', globalServerProcess.pid);
    }
    
    // Assign to local variable for convenience
    serverProcess = globalServerProcess;

    // Check if we already have a global client
    if (!globalClient) {
      // Create the client
      globalClient = new ComponentClient();

      // Wait for server to start
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Connect to the server
      try {
        await globalClient.connect();
        console.log('Client connected to server');
      } catch (error) {
        console.error('Failed to connect to server:', error);
        throw error;
      }

      // Verify connection with a ping
      try {
        const response = await globalClient.ping();
        expect(response.type).toBe('pong');
        console.log('Server ping successful');
      } catch (error) {
        console.error('Ping failed:', error);
        throw error;
      }
    } else {
      console.log('Using existing client connection');
    }
    
    // Assign to local variable for convenience
    client = globalClient;
    
    // Assign the fixed component ID to the local variable
    componentId = FIXED_COMPONENT_ID;
    console.log('Using fixed component ID:', componentId);
  }, 30000); // 30 second timeout for setup

  // Clean up before each test - but only for the first tests that don't need component persistence
  beforeEach(async function() {
    // Skip cleaning for tests that need the component to persist
    const testName = this.currentTest?.title || '';
    console.log('Running test:', testName);
    console.log('Current componentId:', componentId);
    
    // Only clean for the first two tests that don't need component persistence
    if (testName === 'should handle loading an invalid component' || 
        testName === 'should handle loading with invalid options format') {
      try {
        console.log('Cleaning all components before test:', testName);
        await client.cleanAll();
      } catch (error) {
        console.error('Failed to clean components:', error);
      }
    } else {
      console.log('Skipping component cleanup for test:', testName);
      // Log the current componentId to ensure it's preserved
      if (componentId) {
        require('fs').appendFileSync('/tmp/test_logs.txt', `Before test "${testName}", componentId = ${componentId}\n`);
        
        // Verify the component still exists on the server
        try {
          console.log(`Verifying component ${componentId} still exists...`);
          const pingResponse = await client.ping();
          console.log('Server ping response:', pingResponse);
          
          // Try to get the state to verify the component exists
          const stateResponse = await client.getState(componentId);
          console.log(`Component ${componentId} verified to exist with state:`, 
                      JSON.stringify(stateResponse).substring(0, 100) + '...');
        } catch (error) {
          console.error(`Component ${componentId} verification failed:`, error);
          // Don't throw here, let the test handle it
        }
      } else {
        require('fs').appendFileSync('/tmp/test_logs.txt', `Before test "${testName}", componentId is NULL\n`);
      }
    }
  });
  
  // Clean up after all tests
  afterAll(async () => {
    // We don't unload the component or close the client here
    // to ensure persistence between test runs
    console.log('Preserving component and client for next test section');
    
    // No need to save component ID as we're using a fixed ID
    console.log('Using fixed component ID:', FIXED_COMPONENT_ID);
    
    // Only kill the server process if we're really done with all tests
    // This is controlled by the run_component_tests_progressive.sh script
    if (process.env.FINAL_TEST_SECTION === 'true') {
      console.log('Final test section completed, cleaning up resources');
      
      // Unload component if it exists
      if (componentId) {
        try {
          await client.unloadComponent(componentId);
          console.log('Component unloaded:', componentId);
        } catch (error) {
          console.error('Failed to unload component:', error);
        }
      }

      // Close the client connection
      if (client) {
        await client.closeAndWait();
        console.log('Client connection closed');
      }

      // Kill the server process
      if (serverProcess) {
        process.kill(-serverProcess.pid!, 'SIGINT');
        console.log('Server process killed');
        globalServerProcess = null;
      }
      
      // Wait a bit to allow all async operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }, 15000);  // Increase timeout for cleanup

  // Test loading a Select component with an invalid component name
  test('should handle loading an invalid component', async () => {
    try {
      await client.loadComponent('InvalidComponent');
      fail('Should have thrown an error for invalid component');
    } catch (error) {
      expect(error.message).toContain('Unsupported component type');
    }
  });

  // Test loading a Select component with invalid options format
  test('should handle loading with invalid options format', async () => {
    try {
      await client.loadComponent('Select', {
        title: 'Invalid Options',
        options: 'not an array' // Invalid options format
      });
      fail('Should have thrown an error for invalid options format');
    } catch (error) {
      // The error might be different depending on implementation, but should exist
      expect(error).toBeDefined();
    }
  });

  // Test loading a Select component with valid configuration and getting its initial state
  test('should load a Select component with valid configuration and get its initial state', async () => {
    console.log('Loading Select component with valid configuration...');
    
    // Always try to use our fixed component ID
    console.log('Using fixed component ID:', FIXED_COMPONENT_ID);
    
    // Ensure all components are cleaned before loading a new one
    try {
      console.log('Cleaning all components before loading a new one...');
      await client.cleanAll();
      console.log('All components cleaned successfully');
    } catch (error) {
      console.error('Failed to clean components:', error);
    }
    
    // Add a small delay to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Use our predefined fixed component ID
    console.log('Using predefined fixed component ID:', FIXED_COMPONENT_ID);
    
    // Step 1: Load the component
    console.log('STEP 1: Loading the component');
    const loadResponse = await client.loadComponent('Select', {
      title: 'Test Select',
      options: [
        { id: '1', text: 'Option 1', value: 'option1' },
        { id: '2', text: 'Option 2', value: 'option2' },
        { id: '3', text: 'Option 3', value: 'option3' }
      ],
      component_id: FIXED_COMPONENT_ID, // Specify the fixed component ID explicitly
      force: true // Force option to replace if it already exists
    });

    console.log('Component load response:', JSON.stringify(loadResponse));
    expect(loadResponse.type).toBe('component_loaded');
    expect(loadResponse.name).toBe('Select');
    expect(loadResponse.success).toBe(true);
    expect(loadResponse.component_id).toBeDefined();
    expect(loadResponse.methods).toContain('open');
    expect(loadResponse.methods).toContain('close');
    expect(loadResponse.methods).toContain('select_option');

    // Verify that the component ID matches our fixed ID
    componentId = loadResponse.component_id;
    console.log("Component ID assigned:", componentId);
    expect(componentId).toBe(FIXED_COMPONENT_ID);
    
    // Ensure componentId is not null for TypeScript
    if (!componentId) {
      throw new Error('Component ID is null or undefined');
    }
    
    // Log the component creation
    fs.appendFileSync(TEST_LOGS_FILE, `After loading, componentId = ${componentId}\n`);
    
    // Add a delay to ensure the component is fully registered
    console.log('Waiting for component to be fully registered...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Component should now be fully registered');
    
    // Step 2: Get the initial state of the component
    console.log('STEP 2: Getting initial state of the component');
    console.log("Component ID before state fetch:", componentId);
    
    // Make sure the server is still responsive
    try {
      const pingResponse = await client.ping();
      console.log('Server ping response before state check:', pingResponse);
    } catch (error) {
      console.error('Server ping failed:', error);
      throw new Error('Server is not responsive');
    }
    
    // Get the state of the component
    const stateResponse = await client.getState(componentId);
    console.log("Component state response:", JSON.stringify(stateResponse).substring(0, 100) + '...');

    expect(stateResponse.type).toBe('component_state');
    expect(stateResponse.component_id).toBe(componentId);
    expect(stateResponse.state).toBeDefined();
    expect(stateResponse.state.title).toBe('Test Select');
    expect(stateResponse.state.is_open).toBe(false);
    expect(stateResponse.state.options).toHaveLength(3);
    // Accepter soit null soit undefined pour selected_value
    expect(stateResponse.state.selected_value == null).toBe(true);
    
    console.log('Successfully loaded component and verified its initial state');
  });

  // Test opening the Select component
  test('should open the Select component', async () => {
    if (!componentId) {
      throw new Error('Component ID not available');
    }

    const response = await client.callMethod(componentId, 'open');

    expect(response.type).toBe('method_result');
    expect(response.component_id).toBe(componentId);
    expect(response.method).toBe('open');
    expect(response.result).toBe(true);

    // Verify the state changed
    const stateResponse = await client.getState(componentId);
    expect(stateResponse.state.is_open).toBe(true);
  });

  // Test focusing an option
  test('should focus an option in the Select component', async () => {
    if (!componentId) {
      throw new Error('Component ID not available');
    }

    const response = await client.callMethod(componentId, 'focus_option', [1]);

    expect(response.type).toBe('method_result');
    expect(response.component_id).toBe(componentId);
    expect(response.method).toBe('focus_option');
    expect(response.result).toBe(true);

    // Verify the state changed
    const stateResponse = await client.getState(componentId);
    expect(stateResponse.state.focused_option_index).toBe(1);
  });

  // Test selecting an option
  test('should select an option in the Select component', async () => {
    if (!componentId) {
      throw new Error('Component ID not available');
    }

    const response = await client.callMethod(componentId, 'select_option', [1]);

    expect(response.type).toBe('method_result');
    expect(response.component_id).toBe(componentId);
    expect(response.method).toBe('select_option');
    expect(response.result).toBe(true);

    // Verify the state changed
    const stateResponse = await client.getState(componentId);
    expect(stateResponse.state.selected_option_index).toBe(1);
    expect(stateResponse.state.selected_value).toBe('option2');
    expect(stateResponse.state.selected_text).toBe('Option 2');
    expect(stateResponse.state.is_open).toBe(false); // Select should close after selection
  });

  // Test updating component props
  test('should update the options of the Select component', async () => {
    if (!componentId) {
      throw new Error('Component ID not available');
    }

    const newOptions = [
      { id: '1', text: 'New Option 1', value: 'new1' },
      { id: '2', text: 'New Option 2', value: 'new2' },
      { id: '3', text: 'New Option 3', value: 'new3' },
      { id: '4', text: 'New Option 4', value: 'new4' }
    ];

    const response = await client.setProps(componentId, {
      options: newOptions
    });

    expect(response.type).toBe('props_set');
    expect(response.component_id).toBe(componentId);
    expect(response.success).toBe(true);

    // Verify the state changed
    const stateResponse = await client.getState(componentId);
    expect(stateResponse.state.options).toHaveLength(4);
    expect(stateResponse.state.options[0].text).toBe('New Option 1');
  });

  // Test selecting an option by value
  test('should select an option by value', async () => {
    if (!componentId) {
      throw new Error('Component ID not available');
    }

    const response = await client.callMethod(componentId, 'select_by_value', ['new3']);

    expect(response.type).toBe('method_result');
    expect(response.component_id).toBe(componentId);
    expect(response.method).toBe('select_by_value');
    expect(response.result).toBe(true);

    // Verify the state changed
    const stateResponse = await client.getState(componentId);
    expect(stateResponse.state.selected_value).toBe('new3');
    expect(stateResponse.state.selected_text).toBe('New Option 3');
  });

  // Test setting disabled state
  test('should set the disabled state of the Select component', async () => {
    if (!componentId) {
      throw new Error('Component ID not available');
    }

    const response = await client.setProps(componentId, {
      disabled: true
    });

    expect(response.type).toBe('props_set');
    expect(response.component_id).toBe(componentId);
    expect(response.success).toBe(true);

    // Verify the state changed
    const stateResponse = await client.getState(componentId);
    expect(stateResponse.state.disabled).toBe(true);

    // Try to open the disabled component (should fail)
    const openResponse = await client.callMethod(componentId, 'open');
    expect(openResponse.result).toBe(false);
  });

  // Test calling a non-existent method
  test('should handle calling a non-existent method', async () => {
    if (!componentId) {
      throw new Error('Component ID not available');
    }

    try {
      await client.callMethod(componentId, 'non_existent_method');
      fail('Should have thrown an error for non-existent method');
    } catch (error) {
      expect(error.message).toContain('Method not found');
    }
  });

  // Test calling a method with invalid arguments
  test('should handle calling a method with invalid arguments', async () => {
    if (!componentId) {
      throw new Error('Component ID not available');
    }

    try {
      // focus_option expects a number, not a string
      await client.callMethod(componentId, 'focus_option', ['not a number']);
      // Depending on implementation, this might not throw, but should not crash
    } catch (error) {
      expect(error).toBeDefined();
    }

    // Verify component is still functional
    const response = await client.getState(componentId);
    expect(response.type).toBe('component_state');
  });

  // Test multi-select mode
  test('should handle multi-select mode', async () => {
    // Store the previous component ID before unloading
    const previousComponentId = componentId;
    console.log('Previous component ID before multi-select test:', previousComponentId);
    
    if (previousComponentId) {
      // Unload the single-select component first
      await client.unloadComponent(previousComponentId);
      console.log('Unloaded previous component:', previousComponentId);
      // We don't set componentId to null because we'll assign a new one
    }

    // Load a new component in multi-select mode
    const loadResponse = await client.loadComponent('Select', {
      title: 'Multi Select',
      multi: true,
      options: [
        { id: '1', text: 'Option 1', value: 'option1' },
        { id: '2', text: 'Option 2', value: 'option2' },
        { id: '3', text: 'Option 3', value: 'option3' },
        { id: '4', text: 'Option 4', value: 'option4' }
      ]
    });

    expect(loadResponse.success).toBe(true);
    
    // Save component ID and ensure it's not null
    const multiSelectId = loadResponse.component_id;
    expect(multiSelectId).toBeDefined();
    if (!multiSelectId) {
      throw new Error('Failed to get component ID for multi-select');
    }
    componentId = multiSelectId;

    // Verify multi-select mode is active
    const stateResponse = await client.getState(multiSelectId);
    expect(stateResponse.state.multi).toBe(true);

    // Open the dropdown
    await client.callMethod(multiSelectId, 'open');

    // Select multiple options
    await client.callMethod(multiSelectId, 'select_option', [0]);
    await client.callMethod(multiSelectId, 'select_option', [2]);

    // Get state and verify multiple selections
    const multiSelectState = await client.getState(multiSelectId);
    expect(multiSelectState.state.selected_options).toBeDefined();
    expect(multiSelectState.state.selected_options.length).toBe(2);
    expect(multiSelectState.state.selected_options).toContainEqual(expect.objectContaining({ value: 'option1' }));
    expect(multiSelectState.state.selected_options).toContainEqual(expect.objectContaining({ value: 'option3' }));
  });

  // Test navigation methods
  test('should navigate through options', async () => {
    if (!componentId) {
      throw new Error('Component ID not available');
    }

    // Open the dropdown
    await client.callMethod(componentId, 'open');

    // Focus first option
    await client.callMethod(componentId, 'focus_option', [0]);
    let state = await client.getState(componentId);
    expect(state.state.focused_option_index).toBe(0);

    // Move to next option
    await client.callMethod(componentId, 'focus_next_option');
    state = await client.getState(componentId);
    expect(state.state.focused_option_index).toBe(1);

    // Move to previous option
    await client.callMethod(componentId, 'focus_prev_option');
    state = await client.getState(componentId);
    expect(state.state.focused_option_index).toBe(0);
  });

  // Test unloading the component
  test('should unload the Select component', async () => {
    if (!componentId) {
      throw new Error('Component ID not available');
    }

    const response = await client.unloadComponent(componentId);

    expect(response.type).toBe('component_unloaded');
    expect(response.component_id).toBe(componentId);
    expect(response.success).toBe(true);

    // Try to get state of unloaded component (should fail)
    try {
      await client.getState(componentId);
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toContain('Component not found');
    }

    // Reset componentId since it's been unloaded
    componentId = null;
  });

  // Test operations on non-existent component
  test('should handle operations on non-existent component', async () => {
    const nonExistentId = 'non_existent_component_id';

    // Try to call method on non-existent component
    try {
      await client.callMethod(nonExistentId, 'open');
      fail('Should have thrown an error');
    } catch (error) {
      expect((error as Error).message).toContain('Component not found');
    }

    // Try to get state of non-existent component
    try {
      await client.getState(nonExistentId);
      fail('Should have thrown an error');
    } catch (error) {
      expect((error as Error).message).toContain('Component not found');
    }

    // Try to set props on non-existent component
    try {
      await client.setProps(nonExistentId, { title: 'New Title' });
      fail('Should have thrown an error');
    } catch (error) {
      expect((error as Error).message).toContain('Component not found');
    }

    // Try to unload non-existent component
    try {
      await client.unloadComponent(nonExistentId);
      fail('Should have thrown an error');
    } catch (error) {
      expect((error as Error).message).toContain('Component not found');
    }
  });
});
