/**
 * Enhanced mock for bridge/core.ts
 * This mock is cleaner, easier to maintain and test
 */

// Define message types
export enum MessageType {
  INIT = 'init',
  STATE = 'state',
  ACTION = 'action',
  EVENT = 'event',
  RESPONSE = 'response',
  ERROR = 'error'
}

// Define message interface
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
  private static instance: BridgeCore | null = null;
  private handlers: Map<string, MessageHandler> = new Map();
  
  // Mocks for tests
  public sendMessage = jest.fn().mockImplementation(async (message: BridgeMessage) => {
    return {
      success: true,
      data: { received: true }
    };
  });
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  static getInstance(): BridgeCore {
    if (!BridgeCore.instance) {
      BridgeCore.instance = new BridgeCore();
    }
    return BridgeCore.instance;
  }
  
  /**
   * Register a message handler
   */
  registerHandler(id: string, handler: MessageHandler): void {
    this.handlers.set(id, handler);
  }
  
  /**
   * Unregister a message handler
   */
  unregisterHandler(id: string): void {
    this.handlers.delete(id);
  }
  
  /**
   * Get a message handler
   */
  getHandler(id: string): MessageHandler | undefined {
    return this.handlers.get(id);
  }
  
  /**
   * Simulate receiving a message
   */
  async receiveMessage(message: BridgeMessage | string): Promise<void> {
    const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
    const handler = this.handlers.get(parsedMessage.id);
    
    if (handler) {
      await handler(parsedMessage);
    }
  }
  
  /**
   * Reset all mocks and handlers
   */
  resetMocks(): void {
    this.sendMessage.mockClear();
    this.handlers.clear();
  }
  
  /**
   * Reset singleton instance (useful for tests)
   */
  static resetInstance(): void {
    if (BridgeCore.instance) {
      BridgeCore.instance.resetMocks();
      BridgeCore.instance = null;
    }
  }
}

// Export singleton instance
export const bridgeCore = BridgeCore.getInstance();
