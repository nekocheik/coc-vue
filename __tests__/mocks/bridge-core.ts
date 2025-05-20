// Mock version of bridge/core.ts for testing
import { mockNvim } from './nvim';

// Define message types
export enum MessageType {
  INIT = 'init',
  STATE = 'state',
  ACTION = 'action',
  EVENT = 'event',
  RESPONSE = 'response',
  ERROR = 'error'
}

// Define bridge message interface
export interface BridgeMessage {
  id: string;
  type: MessageType;
  action?: string;
  payload?: any;
}

// Mock BridgeCore class
export class BridgeCore {
  private static instance: BridgeCore;
  
  private constructor() {}
  
  static getInstance(): BridgeCore {
    if (!BridgeCore.instance) {
      BridgeCore.instance = new BridgeCore();
    }
    return BridgeCore.instance;
  }
  
  async sendMessage(message: BridgeMessage): Promise<any> {
    // Mock implementation that just returns a success response
    return {
      success: true,
      data: { received: true }
    };
  }
  
  async receiveMessage(message: string): Promise<void> {
    // Mock implementation
    const parsedMessage = JSON.parse(message);
    // Process message if needed for tests
  }
}

// Export singleton instance
export const bridgeCore = BridgeCore.getInstance();
