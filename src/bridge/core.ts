// src/bridge/core.ts
import { workspace } from 'coc.nvim';

/**
 * Standard message protocol for communication between TypeScript and Lua
 */
export interface BridgeMessage {
  id: string;                // Component instance identifier
  type: MessageType;         // Type of message
  action: string;            // Generic action name
  payload?: any;             // Additional data
  timestamp?: number;        // Optional timestamp for tracking
  correlationId?: string;    // Optional correlation ID for request/response pairing
}

/**
 * Types of messages that can be sent through the bridge
 */
export enum MessageType {
  EVENT = 'event',           // Component event notification
  ACTION = 'action',         // Action to be performed
  STATE = 'state',           // State update
  SYNC = 'sync',             // Synchronization message
  REQUEST = 'request',       // Request for data or action
  RESPONSE = 'response',     // Response to a request
  ERROR = 'error'            // Error notification
}

/**
 * Handler function type for processing incoming messages
 */
export type MessageHandler = (message: BridgeMessage) => Promise<any> | void;

/**
 * Core bridge for communication between TypeScript and Lua
 */
export class BridgeCore {
  private static instance: BridgeCore;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private globalHandlers: Set<MessageHandler> = new Set();
  private nvim = workspace.nvim;
  private messageQueue: BridgeMessage[] = [];
  private isProcessing: boolean = false;

  private constructor() {
    // Initialize message receiver from Lua
    this.setupMessageReceiver();
  }

  /**
   * Get singleton instance of BridgeCore
   */
  public static getInstance(): BridgeCore {
    if (!BridgeCore.instance) {
      BridgeCore.instance = new BridgeCore();
    }
    return BridgeCore.instance;
  }

  /**
   * Set up the message receiver to handle messages from Lua
   */
  private async setupMessageReceiver(): Promise<void> {
    try {
      // Register a global function that Lua can call to send messages to TypeScript
      await this.nvim.command(`
        function! CocVueBridgeReceiveMessage(message)
          call CocAction('runCommand', 'vue.bridge.receiveMessage', a:message)
        endfunction
      `);
      
      // Ensure the Lua bridge is initialized
      await this.nvim.command(`lua require('vue-ui.core.bridge').initialize()`);
      
      // Log successful setup
      console.log('[BridgeCore] Message receiver setup complete');
    } catch (error) {
      console.error('[BridgeCore] Failed to setup message receiver:', error);
    }
  }

  /**
   * Send a message to Lua
   * @param message The message to send
   * @returns Promise resolving to any response
   */
  public async sendMessage(message: BridgeMessage): Promise<any> {
    if (!message.timestamp) {
      message.timestamp = Date.now();
    }
    
    try {
      const serializedMessage = JSON.stringify(message);
      const escapedMessage = serializedMessage.replace(/'/g, "''");
      
      // Send the message to Lua bridge
      const result = await this.nvim.command(
        `lua return require('vue-ui.core.bridge').receiveMessage('${escapedMessage}')`
      );
      
      return result;
    } catch (error) {
      console.error(`[BridgeCore] Error sending message:`, error);
      throw error;
    }
  }

  /**
   * Receive a message from Lua
   * @param serializedMessage The serialized message from Lua
   */
  public async receiveMessage(serializedMessage: string): Promise<void> {
    try {
      const message: BridgeMessage = JSON.parse(serializedMessage);
      
      // Add to queue and process
      this.messageQueue.push(message);
      this.processMessageQueue();
    } catch (error) {
      // TODO: Test coverage - Add test for error handling in receiveMessage method
      console.error('[BridgeCore] Error receiving message:', error);
    }
  }

  /**
   * Process the message queue
   */
  private async processMessageQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) {
      // TODO: Test coverage - Add test for early return conditions in processMessageQueue
      return;
    }
    
    this.isProcessing = true;
    
    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift()!;
        
        // Process with action-specific handlers
        const actionHandlers = this.handlers.get(message.action);
        if (actionHandlers) {
          for (const handler of actionHandlers) {
            await Promise.resolve(handler(message));
          }
        }
        
        // Process with global handlers
        for (const handler of this.globalHandlers) {
          await Promise.resolve(handler(message));
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Register a handler for a specific action
   * @param action The action to handle
   * @param handler The handler function
   */
  public registerHandler(action: string, handler: MessageHandler): void {
    if (!this.handlers.has(action)) {
      this.handlers.set(action, new Set());
    }
    
    this.handlers.get(action)!.add(handler);
  }

  /**
   * Unregister a handler for a specific action
   * @param action The action to unregister the handler from
   * @param handler The handler function to unregister
   */
  public unregisterHandler(action: string, handler: MessageHandler): void {
    if (!this.handlers.has(action)) {
      // TODO: Test coverage - Add test for unregistering a handler for a non-existent action
      return;
    }
    
    this.handlers.get(action)!.delete(handler);
    
    // Clean up empty sets
    if (this.handlers.get(action)!.size === 0) {
      this.handlers.delete(action);
    }
  }

  /**
   * Register a global handler that receives all messages
   * @param handler The global handler function
   */
  public registerGlobalHandler(handler: MessageHandler): void {
    this.globalHandlers.add(handler);
  }

  /**
   * Unregister a global handler
   * @param handler The global handler function to unregister
   */
  public unregisterGlobalHandler(handler: MessageHandler): void {
    this.globalHandlers.delete(handler);
  }
}

// Export singleton instance
export const bridgeCore = BridgeCore.getInstance();
