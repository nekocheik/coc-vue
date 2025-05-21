/**
 * Robust mock for VimComponent
 * This mock simulates the basic behavior of the Vim component
 */
import bridgeCore, { MessageType } from './bridge-core';

// Base class for Vim components
export default class VimComponent {
  // Component properties
  id: string;
  type: string;
  options: Record<string, any>;
  state: Record<string, any>;
  mounted: boolean = false;
  
  // Constructor
  constructor(id: string, type: string, options: Record<string, any> = {}) {
    this.id = id;
    this.type = type;
    this.options = { ...options };
    this.state = { ...options };
    
    // Set up message handler
    this.setupMessageHandler();
  }
  
  // Set up message handler
  private setupMessageHandler() {
    bridgeCore.onMessage((message) => {
      // Process only messages intended for this component
      if (message.payload?.id !== this.id) {
        return;
      }
      
      // Process method requests
      if (message.type === MessageType.REQUEST && message.action === 'callMethod') {
        this.handleMethodCall(message);
      }
      
      // Process state requests
      if (message.type === MessageType.REQUEST && message.action === 'getState') {
        this.handleGetState(message);
      }
    });
  }
  
  // Handle method calls
  private async handleMethodCall(message: any) {
    const { method, args = [] } = message.payload || {};
    
    // Check if method exists
    if (typeof (this as any)[method] === 'function') {
      try {
        // Call method
        const result = await (this as any)[method](...args);
        
        // Send response
        await bridgeCore.sendMessage({
          id: Date.now().toString(),
          type: MessageType.RESPONSE,
          action: 'methodResult',
          correlationId: message.id,
          payload: { result }
        });
      } catch (error) {
        // Send error
        await bridgeCore.sendMessage({
          id: Date.now().toString(),
          type: MessageType.ERROR,
          action: 'methodError',
          correlationId: message.id,
          payload: { error: error instanceof Error ? error.message : String(error) }
        });
      }
    } else {
      // Method not found
      await bridgeCore.sendMessage({
        id: Date.now().toString(),
        type: MessageType.ERROR,
        action: 'methodError',
        correlationId: message.id,
        payload: { error: `Method '${method}' not found` }
      });
    }
  }
  
  // Handle state requests
  private async handleGetState(message: any) {
    // Send current state
    await bridgeCore.sendMessage({
      id: Date.now().toString(),
      type: MessageType.RESPONSE,
      action: 'stateResult',
      correlationId: message.id,
      payload: { state: this.state }
    });
  }
  
  // Update state and emit event
  protected updateState(newState: Partial<Record<string, any>>, eventName?: string) {
    // Update state
    this.state = { ...this.state, ...newState };
    
    // Emit event if needed
    if (eventName) {
      this.emitEvent(eventName, newState);
    }
  }
  
  // Emit event
  protected emitEvent(eventName: string, payload: any = {}) {
    bridgeCore.sendMessage({
      id: Date.now().toString(),
      type: MessageType.EVENT,
      action: eventName,
      payload: {
        componentId: this.id,
        ...payload
      }
    });
  }
  
  // Method to mount component
  async mount() {
    this.mounted = true;
    this.updateState({ mounted: true }, `${this.type}:mounted`);
    return true;
  }
  
  // Method to unmount component
  async unmount() {
    this.mounted = false;
    this.updateState({ mounted: false }, `${this.type}:unmounted`);
    return true;
  }
  
  // Method to update options
  async updateOptions(options: Record<string, any>) {
    this.options = { ...this.options, ...options };
    this.updateState(options, `${this.type}:optionsUpdated`);
    return true;
  }
}
