/**
 * Robust client for communicating with Neovim
 * This client efficiently handles connections and errors
 * Uses dynamic server information
 */
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';

// Function to get server information
function getServerInfo(): { host: string, port: number } {
  try {
    const serverInfoPath = path.join(__dirname, '../.server-info.json');
    if (fs.existsSync(serverInfoPath)) {
      const serverInfo = JSON.parse(fs.readFileSync(serverInfoPath, 'utf8'));
      return {
        host: serverInfo.host,
        port: serverInfo.port
      };
    }
  } catch (err) {
    console.error('Error reading server information:', 
      err instanceof Error ? err.message : String(err));
  }
  
  // Default values if file doesn't exist
  return {
    host: '127.0.0.1',
    port: 9999
  };
}

// Types to improve readability and maintenance
export interface ComponentConfig {
  id: string;
  [key: string]: any;
}

export interface CommandResponse {
  id: string;
  success: boolean;
  error?: string;
  result?: any;
  state?: any;
  events?: any[];
  message?: string;
}

export class NeovimClient {
  private socket: net.Socket;
  private connected: boolean = false;
  private responseCallbacks: Map<string, (response: any) => void> = new Map();
  private messageQueue: { command: any, resolve: Function, reject: Function }[] = [];
  private processingQueue: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private static instance: NeovimClient | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  /**
   * Use singleton pattern to avoid multiple connections
   */
  public static getInstance(): NeovimClient {
    if (!NeovimClient.instance) {
      NeovimClient.instance = new NeovimClient();
    }
    return NeovimClient.instance;
  }

  private constructor() {
    this.socket = new net.Socket();
    this.setupSocketEventHandlers();
  }

  /**
   * Set up socket event handlers
   */
  private setupSocketEventHandlers(): void {
    // Handle disconnection gracefully
    this.socket.on('close', () => {
      if (this.connected) {
        if (process.env.VERBOSE_LOGS === 'true') {
          console.log('Connection to Neovim server closed');
        }
        this.connected = false;
        
        // Attempt automatic reconnection if needed
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          if (process.env.VERBOSE_LOGS === 'true') {
            console.log(`Automatic reconnection attempt (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          }
          setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
        } else {
          // Reject all pending promises
          this.responseCallbacks.forEach(callback => {
            callback({ success: false, error: 'Connection closed' });
          });
          this.responseCallbacks.clear();
        }
      }
    });
  }

  /**
   * Connect to Neovim server with improved error handling and retries
   * Uses dynamic server information if no port is specified
   */
  async connect(port?: number, host?: string, maxRetries: number = 5): Promise<void> {
    // Use dynamic server information if no port is specified
    if (!port || !host) {
      const serverInfo = getServerInfo();
      port = port || serverInfo.port;
      host = host || serverInfo.host;
    }
    // If already connected, return immediately
    if (this.connected) {
      if (process.env.VERBOSE_LOGS === 'true') {
        console.log('Already connected to Neovim server');
      }
      return Promise.resolve();
    }
    
    // If a connection is in progress, wait for it to complete
    if (this.connectionPromise) {
      if (process.env.VERBOSE_LOGS === 'true') {
        console.log('Connection in progress, waiting...');
      }
      return this.connectionPromise;
    }
    
    if (process.env.VERBOSE_LOGS === 'true') {
      console.log(`Attempting to connect to Neovim server (${host}:${port})...`);
    }
    
    // Create a new socket to avoid issues with old connections
    this.socket = new net.Socket();
    this.setupSocketEventHandlers();
    
    this.connectionPromise = new Promise<void>((resolve, reject) => {
      const tryConnect = (attemptsLeft: number) => {
        // Clean up previous listeners to avoid memory leaks
        this.socket.removeAllListeners('connect');
        this.socket.removeAllListeners('error');
        this.socket.removeAllListeners('timeout');
        
        // Set connection timeout
        this.socket.setTimeout(5000);
        
        this.socket.once('timeout', () => {
          if (process.env.VERBOSE_LOGS === 'true') {
            console.log(`Connection timeout (attempt ${maxRetries - attemptsLeft + 1}/${maxRetries})`);
          }
          this.socket.destroy();
          
          if (attemptsLeft > 1) {
            const delay = Math.min(1000 * Math.pow(2, maxRetries - attemptsLeft), 5000);
            if (process.env.VERBOSE_LOGS === 'true') {
              console.log(`Retrying in ${delay}ms...`);
            }
            setTimeout(() => tryConnect(attemptsLeft - 1), delay);
          } else {
            this.connectionPromise = null;
            reject(new Error(`Connection timeout to Neovim server after ${maxRetries} attempts`));
          }
        });
        
        this.socket.once('connect', () => {
          if (process.env.VERBOSE_LOGS === 'true') {
            console.log('Successfully connected to Neovim server');
          }
          this.connected = true;
          this.reconnectAttempts = 0;
          this.socket.setTimeout(0); // Disable timeout after connection
          
          // Set up data handler
          this.socket.on('data', (data) => {
            try {
              const response = JSON.parse(data.toString());
              const callback = this.responseCallbacks.get(response.id);
              if (callback) {
                callback(response);
                this.responseCallbacks.delete(response.id);
              }
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : String(err);
              console.error('Error while processing response:', errorMsg);
            }
          });
          
          // Process pending messages
          this.processQueue();
          
          this.connectionPromise = null;
          resolve();
        });
        
        this.socket.once('error', (err: Error | unknown) => {
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (process.env.VERBOSE_LOGS === 'true') {
            console.log(`Connection error: ${errorMsg} (attempt ${maxRetries - attemptsLeft + 1}/${maxRetries})`);
          }
          this.socket.destroy();
          
          if (attemptsLeft > 1) {
            // Retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, maxRetries - attemptsLeft), 5000);
            if (process.env.VERBOSE_LOGS === 'true') {
              console.log(`Retrying in ${delay}ms...`);
            }
            setTimeout(() => tryConnect(attemptsLeft - 1), delay);
          } else {
            this.connectionPromise = null;
            reject(new Error(`Failed to connect to Neovim server after ${maxRetries} attempts: ${errorMsg}`));
          }
        });
        
        // Attempt to connect
        if (process.env.VERBOSE_LOGS === 'true') {
          console.log(`Connection attempt ${maxRetries - attemptsLeft + 1}/${maxRetries}...`);
        }
        try {
          this.socket.connect(port, host);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`Error during connection attempt: ${errorMsg}`);
          this.socket.emit('error', err);
        }
      };
      
      tryConnect(maxRetries);
    });
    
    return this.connectionPromise;
  }

  /**
   * Process the message queue
   */
  private async processQueue() {
    if (this.processingQueue || this.messageQueue.length === 0) {
      return;
    }
    
    this.processingQueue = true;
    
    while (this.messageQueue.length > 0) {
      const { command, resolve, reject } = this.messageQueue.shift()!;
      
      try {
        const result = await this.sendCommandInternal(command);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    }
    
    this.processingQueue = false;
  }

  /**
   * Send a command to the Neovim server
   */
  private async sendCommandInternal(command: any): Promise<CommandResponse> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        if (process.env.VERBOSE_LOGS === 'true') {
          console.log('Attempting to send command without active connection');
        }
        reject(new Error('Not connected to Neovim server'));
        return;
      }

      // Generate unique ID for command
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      command.id = id;
      
      // Debug log for command
      const commandType = command.type || 'unknown';
      if (process.env.VERBOSE_LOGS === 'true') {
        console.log(`Sending command: ${commandType} (ID: ${id})`);
      }
      
      // Set timeout to avoid infinite waits (15 seconds)
      const timeout = setTimeout(() => {
        if (process.env.VERBOSE_LOGS === 'true') {
          console.log(`TIMEOUT: No response received for command ${commandType} (ID: ${id}) after 15 seconds`);
        }
        this.responseCallbacks.delete(id);
        reject(new Error(`Timeout while waiting for response to command: ${commandType}`));
      }, 15000);
      
      this.responseCallbacks.set(id, (response) => {
        clearTimeout(timeout);
        if (process.env.VERBOSE_LOGS === 'true') {
          console.log(`Response received for command ${commandType} (ID: ${id}): ${response.success ? 'success' : 'failure'}`);
        }
        
        if (response.success) {
          resolve(response);
        } else {
          const errorMsg = response.error || 'Unknown error';
          if (process.env.VERBOSE_LOGS === 'true') {
            console.log(`Error for command ${commandType}: ${errorMsg}`);
          }
          reject(new Error(errorMsg));
        }
      });
      
      try {
        const jsonCommand = JSON.stringify(command);
        this.socket.write(jsonCommand, (err) => {
          if (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            if (process.env.VERBOSE_LOGS === 'true') {
              console.log(`Error sending command ${commandType}: ${errorMsg}`);
            }
            clearTimeout(timeout);
            this.responseCallbacks.delete(id);
            reject(err);
          }
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (process.env.VERBOSE_LOGS === 'true') {
          console.log(`Exception while sending command ${commandType}: ${errorMsg}`);
        }
        clearTimeout(timeout);
        this.responseCallbacks.delete(id);
        reject(err);
      }
    });
  }

  /**
   * Send a command to the Neovim server with queueing
   */
  async sendCommand(command: any): Promise<CommandResponse> {
    // If not connected, attempt to reconnect automatically
    if (!this.connected) {
      try {
        await this.connect();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    
    return new Promise((resolve, reject) => {
      this.messageQueue.push({ command, resolve, reject });
      
      if (this.connected && !this.processingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Check if the server is alive
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.sendCommand({ type: 'ping' });
      return response.success && response.message === 'pong';
    } catch (err) {
      return false;
    }
  }

  /**
   * Load a component into the Neovim instance
   */
  async loadComponent(config: ComponentConfig): Promise<string> {
    const response = await this.sendCommand({
      type: 'load_component',
      config
    });
    
    return response.id;
  }

  /**
   * Call a method on a component
   */
  async callMethod(componentId: string, method: string, ...args: any[]): Promise<any> {
    const response = await this.sendCommand({
      type: 'call_method',
      id: componentId,
      method,
      args
    });
    
    return response.result;
  }

  /**
   * Get the state of a component
   */
  async getState(componentId: string): Promise<any> {
    const response = await this.sendCommand({
      type: 'get_state',
      id: componentId
    });
    
    return response.state;
  }

  /**
   * Get captured events
   */
  async getEvents(): Promise<any[]> {
    const response = await this.sendCommand({
      type: 'get_events'
    });
    
    return response.events || [];
  }

  /**
   * Disconnect from the Neovim server
   */
  disconnect(): void {
    if (this.connected) {
      if (process.env.VERBOSE_LOGS === 'true') {
        console.log('Disconnecting from Neovim server...');
      }
      
      // Reject all pending promises
      this.responseCallbacks.forEach(callback => {
        callback({ success: false, error: 'Connection closed by client' });
      });
      this.responseCallbacks.clear();
      
      // Clean up message queue
      this.messageQueue = [];
      this.processingQueue = false;
      
      try {
        // Close connection gracefully
        this.socket.end();
        this.socket.destroy();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`Error closing connection: ${errorMsg}`);
      }
      
      this.connected = false;
      if (process.env.VERBOSE_LOGS === 'true') {
        console.log('Disconnected from Neovim server');
      }
    } else if (process.env.VERBOSE_LOGS === 'true') {
      console.log('Already disconnected from Neovim server');
    }
  }
  
  /**
   * Reset the instance (useful for tests)
   */
  static resetInstance(): void {
    if (process.env.VERBOSE_LOGS === 'true') {
      console.log('Resetting NeovimClient instance...');
    }
    
    if (NeovimClient.instance) {
      try {
        // Disconnect gracefully
        NeovimClient.instance.disconnect();
        
        // Reset all internal states
        NeovimClient.instance.responseCallbacks.clear();
        NeovimClient.instance.messageQueue = [];
        NeovimClient.instance.processingQueue = false;
        NeovimClient.instance.connectionPromise = null;
        NeovimClient.instance.connected = false;
        
        // Destroy socket
        if (NeovimClient.instance.socket) {
          NeovimClient.instance.socket.removeAllListeners();
          NeovimClient.instance.socket.destroy();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`Error resetting instance: ${errorMsg}`);
      } finally {
        // Reset instance regardless of errors
        NeovimClient.instance = null;
        if (process.env.VERBOSE_LOGS === 'true') {
          console.log('NeovimClient instance reset');
        }
      }
    } else if (process.env.VERBOSE_LOGS === 'true') {
      console.log('No NeovimClient instance to reset');
    }
  }
}
