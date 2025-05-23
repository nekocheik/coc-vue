/**
 * Vum Events Module
 * 
 * This module provides an event system for communication between
 * TypeScript components and their Lua counterparts.
 */

import { EventEmitter } from 'events';
import { bridgeCore, MessageType } from '../../src/bridge/core';

/**
 * Event bridge for Vum components
 * Handles communication between TypeScript and Lua
 */
class VumEventBridge extends EventEmitter {
  private static instance: VumEventBridge;
  private initialized: boolean = false;

  private constructor() {
    super();
    this.setupBridge();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): VumEventBridge {
    if (!VumEventBridge.instance) {
      VumEventBridge.instance = new VumEventBridge();
    }
    return VumEventBridge.instance;
  }

  /**
   * Set up the bridge to Lua
   */
  private setupBridge(): void {
    if (this.initialized) return;
    
    try {
      // Register a handler for events coming from Lua
      // This will forward events to the appropriate components
      bridgeCore.registerHandler('vum:event', (message) => {
        const eventData = message.payload;
        if (eventData && eventData.type && eventData.id) {
          const eventName = `${eventData.type}:${eventData.id}`;
          this.emit(eventName, eventData.payload);
        }
      });
      
      this.initialized = true;
    } catch (error) {
      console.error('[VumEventBridge] Error setting up bridge:', error);
    }
  }

  /**
   * Send an event to Lua
   * @param eventType Event type
   * @param componentId Component ID
   * @param payload Event payload
   */
  public sendToLua(eventType: string, componentId: string, payload?: any): void {
    try {
      // Send a message to Lua bridge
      bridgeCore.sendMessage({
        id: componentId,
        type: MessageType.EVENT,
        action: eventType,
        payload: payload || {}
      });
    } catch (error) {
      console.error(`[VumEventBridge] Error sending event ${eventType} to Lua:`, error);
    }
  }
}

// Export a singleton instance
export const eventBridge = VumEventBridge.getInstance();
