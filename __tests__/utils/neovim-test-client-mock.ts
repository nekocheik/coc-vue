/**
 * Neovim test client with mock
 * This file provides a test client that uses the Neovim mock instead of a real connection
 */

import { NeovimClientMock } from '../mocks/neovim-mock';

// Test client class for Neovim
export class NeovimTestClient {
  private static instance: NeovimTestClient | null = null;
  private client: NeovimClientMock;
  
  private constructor() {
    this.client = NeovimClientMock.getInstance();
  }
  
  // Singleton pattern
  public static getInstance(): NeovimTestClient {
    if (!NeovimTestClient.instance) {
      NeovimTestClient.instance = new NeovimTestClient();
    }
    return NeovimTestClient.instance;
  }
  
  // Reset the instance (useful for tests)
  public static resetInstance(): void {
    NeovimClientMock.resetInstance();
    NeovimTestClient.instance = null;
  }
  
  // Connect to Neovim server (mock)
  public async connect(): Promise<void> {
    console.log('Connecting to Neovim test server (mock)...');
    await this.client.connect();
    console.log('Successfully connected to Neovim test server (mock)');
  }
  
  // Disconnect from Neovim server (mock)
  public async disconnect(): Promise<void> {
    console.log('Disconnecting from Neovim test server (mock)...');
    await this.client.disconnect();
    console.log('Disconnected from Neovim test server (mock)');
  }
  
  // Call a Lua function (mock)
  public async callFunction(functionName: string, args: any[]): Promise<any> {
    return this.client.callFunction(functionName, args);
  }
  
  // Check if client is connected
  public isConnected(): boolean {
    return this.client.isConnected();
  }
}

// Function to get a test client instance
export function getNeovimTestClient(): NeovimTestClient {
  return NeovimTestClient.getInstance();
}

// Export the function to get the client
export default getNeovimTestClient;
