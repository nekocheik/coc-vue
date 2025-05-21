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
  correlationId?: string;
}

// Define message handler type
export type MessageHandler = (message: BridgeMessage) => Promise<void>;

// Mock BridgeCore class
export class BridgeCore {
  private static instance: BridgeCore;
  private handlers: Map<string, MessageHandler> = new Map();
  
  // Mock for testing
  public sendMessage = jest.fn().mockImplementation(async (message: BridgeMessage) => {
    // Mock implementation that just returns a success response
    return {
      success: true,
      data: { received: true }
    };
  });
  
  private constructor() {}
  
  static getInstance(): BridgeCore {
    if (!BridgeCore.instance) {
      BridgeCore.instance = new BridgeCore();
    }
    return BridgeCore.instance;
  }
  
  registerHandler(id: string, handler: MessageHandler): void {
    this.handlers.set(id, handler);
  }
  
  unregisterHandler(id: string): void {
    this.handlers.delete(id);
  }
  
  getHandler(id: string): MessageHandler | undefined {
    return this.handlers.get(id);
  }
  
  async receiveMessage(message: string): Promise<void> {
    // Mock implementation
    const parsedMessage = JSON.parse(message);
    // Process message if needed for tests
  }
  
  // Reset all mocks for testing
  resetMocks(): void {
    this.sendMessage.mockClear();
    this.handlers.clear();
  }
}

// Export singleton instance
export const bridgeCore = BridgeCore.getInstance();
