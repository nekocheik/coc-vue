// __tests__/integration/select-component-integration.test.ts
// Integration test for Select component via TCP protocol

import * as net from 'net';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

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
}

// Test suite for Select component integration
describe('Select Component Integration', () => {
  let client: ComponentClient;
  let serverProcess: ChildProcess | null = null;
  let componentId: string | null = null;

  // Set up the server and client before all tests
  beforeAll(async () => {
    // Start the component server
    const scriptPath = path.resolve(__dirname, '../../scripts/run_component_server.sh');
    serverProcess = spawn('bash', [scriptPath], {
      detached: true,
      stdio: 'pipe'
    });

    // Log server output
    if (serverProcess.stdout) {
      serverProcess.stdout.on('data', (data) => {
        console.log(`[SERVER] ${data.toString().trim()}`);
      });
    }
    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (data) => {
        console.error(`[SERVER ERROR] ${data.toString().trim()}`);
      });
    }

    // Create the client
    client = new ComponentClient();

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Connect to the server
    try {
      await client.connect();
    } catch (error) {
      console.error('Failed to connect to server:', error);
      throw error;
    }

    // Verify connection with a ping
    try {
      const response = await client.ping();
      expect(response.type).toBe('pong');
    } catch (error) {
      console.error('Ping failed:', error);
      throw error;
    }
  }, 30000); // 30 second timeout for setup

  // Clean up after all tests
  afterAll(async () => {
    // Unload component if it exists
    if (componentId) {
      try {
        await client.unloadComponent(componentId);
      } catch (error) {
        console.error('Failed to unload component:', error);
      }
    }

    // Close the client connection
    if (client) {
      client.close();
    }

    // Kill the server process
    if (serverProcess) {
      process.kill(-serverProcess.pid!, 'SIGINT');
      serverProcess = null;
    }
  });

  // Test loading a Select component
  test('should load a Select component', async () => {
    const response = await client.loadComponent('Select', {
      title: 'Test Select',
      options: [
        { id: '1', text: 'Option 1', value: 'option1' },
        { id: '2', text: 'Option 2', value: 'option2' },
        { id: '3', text: 'Option 3', value: 'option3' }
      ]
    });

    expect(response.type).toBe('component_loaded');
    expect(response.name).toBe('Select');
    expect(response.success).toBe(true);
    expect(response.component_id).toBeDefined();
    expect(response.methods).toContain('open');
    expect(response.methods).toContain('close');
    expect(response.methods).toContain('select_option');

    // Save the component ID for later tests
    componentId = response.component_id;
  });

  // Test getting component state
  test('should get the initial state of the Select component', async () => {
    if (!componentId) {
      throw new Error('Component ID not available');
    }

    const response = await client.getState(componentId);

    expect(response.type).toBe('component_state');
    expect(response.component_id).toBe(componentId);
    expect(response.state).toBeDefined();
    expect(response.state.title).toBe('Test Select');
    expect(response.state.is_open).toBe(false);
    expect(response.state.options).toHaveLength(3);
    expect(response.state.selected_value).toBeNull();
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
});
