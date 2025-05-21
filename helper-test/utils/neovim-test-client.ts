// __tests__/utils/neovim-test-client.ts
import * as net from 'net';

/**
 * Client for communicating with a real Neovim instance running the test server
 */
export class NeovimTestClient {
  private socket: net.Socket;
  private connected: boolean = false;
  private responseCallbacks: Map<string, (response: any) => void> = new Map();
  private messageQueue: { command: any, resolve: Function, reject: Function }[] = [];
  private processingQueue: boolean = false;

  constructor() {
    this.socket = new net.Socket();
  }

  /**
   * Connect to the Neovim test server
   */
  async connect(port: number = 9999, host: string = '127.0.0.1', retries: number = 5): Promise<void> {
    return new Promise((resolve, reject) => {
      const tryConnect = (attemptsLeft: number) => {
        this.socket.connect(port, host, () => {
          console.log('Connected to Neovim test server');
          this.connected = true;
          
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
              console.error('Error parsing response:', err);
            }
          });
          
          // Process any queued messages
          this.processQueue();
          
          resolve();
        });
        
        this.socket.on('error', (err) => {
          if (attemptsLeft > 0) {
            console.log(`Connection attempt failed, retrying... (${attemptsLeft} attempts left)`);
            setTimeout(() => tryConnect(attemptsLeft - 1), 1000);
          } else {
            reject(new Error(`Failed to connect to Neovim test server: ${err.message}`));
          }
        });
      };
      
      tryConnect(retries);
    });
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
   * Send a command to the Neovim test server
   */
  private async sendCommandInternal(command: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to Neovim server'));
        return;
      }

      const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      command.id = id;
      
      this.responseCallbacks.set(id, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Unknown error'));
        }
      });
      
      this.socket.write(JSON.stringify(command));
    });
  }

  /**
   * Send a command to the Neovim test server
   */
  async sendCommand(command: any): Promise<any> {
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
   * Load a component in the Neovim instance
   */
  async loadComponent(config: any): Promise<string> {
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
   * Get events that have been captured
   */
  async getEvents(): Promise<any[]> {
    const response = await this.sendCommand({
      type: 'get_events'
    });
    
    return response.events;
  }

  /**
   * Disconnect from the Neovim test server
   */
  disconnect(): void {
    if (this.connected) {
      this.socket.end();
      this.connected = false;
    }
  }
}
