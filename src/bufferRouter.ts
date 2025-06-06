import { ExtensionContext, workspace, Disposable } from 'coc.nvim';
import { EventEmitter } from 'events';
import { bridgeCore, BridgeMessage } from './bridge/core'; // Corrected path, removed MessageType

// Import events differently to avoid undefined issues in tests
let events: any;
try {
  // This import may fail in test environments
  events = require('coc.nvim').events;
} catch (e) {
  // Create mock events in test environment
  events = {
    on: () => ({ dispose: () => {} })
  };
}

/**
 * Interface representing a buffer route
 */
export interface BufferRoute {
  id: string;
  path: string;
  query: Record<string, any>;
  createdAt: number;
  nvimBufferId?: number; // Optional Neovim buffer ID for easier validation
}

/**
 * Type for buffer content updates
 * - undefined: keep the line unchanged
 * - null: delete the line
 * - string: add or update the line
 */
export type BufferUpdate = (string | null | undefined)[];

/**
 * Class that bridges Lua buffer router with Coc.nvim
 * Provides methods to create, delete, and switch buffers with full reactivity support.
 * Implements an EventEmitter-based reactive system to notify subscribers of buffer changes.
 * Handles errors gracefully to ensure UI consistency and prevent crashes.
 * Core component for buffer management that integrates TypeScript with Lua-based Neovim buffers.
 */
export class BufferRouter implements Disposable {
  private callbackRegistry: Map<string, (...args: any[]) => void> = new Map();
  private nextCallbackId = 0;

  private nvim = workspace.nvim;
  private disposables: Disposable[] = [];
  private emitter = new EventEmitter();
  private currentBuffer: BufferRoute | null = null;
  
  /**
   * Event names used by the BufferRouter
   */
  static readonly Events = {
    BUFFER_CREATED: 'buffer-created',
    BUFFER_DELETED: 'buffer-deleted',
    BUFFER_SWITCHED: 'buffer-switched',
    BUFFER_UPDATED: 'buffer-updated',
    CURRENT_BUFFER_CHANGED: 'current-buffer-changed'
  };
  
  constructor(context: ExtensionContext) {
    // Increase max listeners to prevent memory leak warnings
    this.emitter.setMaxListeners(20);
    
    // Ensure Lua buffer_router is loaded when this class is instantiated
    this.loadLuaModule();
    
    // Listen to buffer events from Neovim
    this.setupEventListeners(context);
    
    // Initialize the current buffer
    this.refreshCurrentBuffer();

    // Register a handler with bridgeCore to execute callbacks from Lua
    bridgeCore.registerHandler('execute_buffer_callback', (message: BridgeMessage) => {
      if (message.payload && typeof message.payload.callbackId === 'string' && Array.isArray(message.payload.args)) {
        this.executeCallback(message.payload.callbackId, message.payload.args);
      } else {
        console.error('[BufferRouter] Invalid payload for execute_buffer_callback:', message.payload);
      }
    });
  }
  
  /**
   * Set up event listeners for buffer changes
   * @private
   */
  private setupEventListeners(context: ExtensionContext): void {
    try {
      // Only set up event listeners if events is properly defined
      if (events && typeof events.on === 'function') {
        // Listen to buffer events from Neovim
        const bufferChangedDisposable = events.on(
          'BufEnter',
          async () => {
            await this.refreshCurrentBuffer();
          },
          null,
          context.subscriptions
        );
        
        this.disposables.push(bufferChangedDisposable);
      } else {
        console.log('[BufferRouter] Events API not available, using polling for buffer changes');
        // Set up polling as fallback
        const intervalId = setInterval(() => {
          this.refreshCurrentBuffer().catch(e => {
            console.error('Error refreshing buffer in polling mode:', e);
          });
        }, 1000);
        
        // Create a disposable for the interval
        this.disposables.push({
          dispose: () => clearInterval(intervalId)
        });
      }
    } catch (error) {
      console.error('[BufferRouter] Error setting up event listeners:', error);
    }
  }
  
  /**
   * Refresh the current buffer information
   * Public for testing purposes
   */
  public async refreshCurrentBuffer(): Promise<void> {
    try {
      const buffer = await this.getCurrentBuffer();
      
      // Check if the buffer has changed
      const hasChanged = this.hasBufferChanged(this.currentBuffer, buffer);
      
      if (hasChanged) {
        const oldBuffer = this.currentBuffer;
        this.currentBuffer = buffer;
        
        // Emit the change event with old and new buffer
        this.emitter.emit(BufferRouter.Events.CURRENT_BUFFER_CHANGED, {
          oldBuffer,
          newBuffer: buffer
        });
      }
    } catch (error) {
      console.error('Error refreshing current buffer:', error);
    }
  }
  
  /**
   * Check if a buffer has changed
   * @private
   * @param oldBuffer - Previous buffer state
   * @param newBuffer - New buffer state
   * @returns Whether the buffer has changed
   */
  private hasBufferChanged(oldBuffer: BufferRoute | null, newBuffer: BufferRoute | null): boolean {
    // If both are null, no change
    if (oldBuffer === null && newBuffer === null) return false;
    
    // If one is null and the other isn't, that's a change
    if (oldBuffer === null || newBuffer === null) return true;
    
    // Compare relevant properties
    return (
      oldBuffer.id !== newBuffer.id ||
      oldBuffer.path !== newBuffer.path ||
      JSON.stringify(oldBuffer.query) !== JSON.stringify(newBuffer.query)
    );
  }
  
  /**
   * Load the Lua buffer_router module
   * @private
   */
  private async loadLuaModule(): Promise<void> {
    await this.nvim.command('lua require("buffer_router")')
  }
  
  /**
   * Call a method on the Lua BufferRouter
   * @private
   * @param method - Method name to call
   * @param args - Arguments to pass to the method
   * @returns Result from the Lua method
   */
  private async callLuaMethod<T>(method: string, ...args: any[]): Promise<T> {
    const serializeArgForLua = (arg: any): string => {
      if (typeof arg === 'string') {
        // Escape single quotes and backslashes for Lua string literals
        const escaped = arg.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
        return `'${escaped}'`;
      }
      if (arg === null || arg === undefined) {
        return 'nil';
      }
      if (typeof arg === 'boolean') {
        return arg ? 'true' : 'false';
      }
      if (typeof arg === 'number') {
        return String(arg);
      }
      if (Array.isArray(arg)) {
        return `{${arg.map(serializeArgForLua).join(', ')}}`;
      }
      if (typeof arg === 'object') {
        const L: string[] = [];
        for (const key in arg) {
          if (Object.prototype.hasOwnProperty.call(arg, key)) {
            // Assuming keys are simple identifiers for Lua.
            // If keys could be complex (e.g., contain spaces or special chars),
            // they would need to be quoted: `['${key}'] = ${serializeArgForLua(arg[key])}`
            L.push(`${key} = ${serializeArgForLua(arg[key])}`);
          }
        }
        return `{${L.join(', ')}}`;
      }
      // Fallback for unknown types
      console.warn(`[BufferRouter] Unknown type for Lua serialization: ${typeof arg}`, arg);
      const escapedFallback = String(arg).replace(/'/g, "\\'").replace(/\\/g, '\\\\');
      return `'${escapedFallback}'`;
    };

    const luaArgs = args.map(serializeArgForLua).join(', ');
    const luaCommand = `return require('buffer_router'):${method}(${luaArgs})`;

    try {
      return await this.nvim.lua(luaCommand) as T;
    } catch (error) {
      console.error(`[BufferRouter] Error executing Lua command: ${luaCommand}`, error);
      throw error; // Re-throw to be caught by the caller
    }
  }

  /**
   * Register a callback function and return its ID.
   * @private
   * @param func - The callback function to register.
   * @returns The ID of the registered callback.
   */
  private registerCallback(func: (...args: any[]) => void): string {
    const callbackId = `cb_${this.nextCallbackId++}`;
    this.callbackRegistry.set(callbackId, func);
    return callbackId;
  }

  /**
   * Execute a registered callback by its ID.
   * This method is called by bridgeCore when Lua requests callback execution.
   * @param callbackId - The ID of the callback to execute.
   * @param args - Arguments to pass to the callback function.
   */
  public executeCallback(callbackId: string, args: any[]): void {
    const func = this.callbackRegistry.get(callbackId);
    if (func) {
      try {
        func(...args);
      } catch (e) {
        console.error(`[BufferRouter] Error executing callback ${callbackId}:`, e);
      }
    } else {
      console.warn(`[BufferRouter] Callback with ID ${callbackId} not found.`);
    }
  }

  public async createBuffer(path: string, query?: Record<string, any>): Promise<string | null> {
    try {
      // Convert query object to query string if provided
      const processedQuery: Record<string, any> = {};
      if (query) {
        for (const key in query) {
          if (Object.prototype.hasOwnProperty.call(query, key)) {
            if (typeof query[key] === 'function' && key.startsWith('on') && key.length > 2 && key[2] === key[2].toUpperCase()) {
              const callbackId = this.registerCallback(query[key] as (...args: any[]) => void);
              processedQuery[key] = { __isCallback: true, id: callbackId };
            } else {
              // Other props are passed as is. Functions not matching on<Event> convention
              // will likely become null or be omitted by JSON.stringify in callLuaMethod.
              processedQuery[key] = query[key];
            }
          }
        }
      }

      const bufferInfo = await this.callLuaMethod<{id: string, nvimBufferId?: number}>('create_buffer', path, processedQuery);
      if (bufferInfo && bufferInfo.id) {
        const bufferId = bufferInfo.id;
        // Get the full buffer data to emit in the event
        const bufferData: BufferRoute = {
          id: bufferId,
          path,
          query: processedQuery, // Use processedQuery here
          createdAt: Date.now(),
          nvimBufferId: bufferInfo.nvimBufferId
        };
        
        // Emit event for buffer creation
        this.emitter.emit(BufferRouter.Events.BUFFER_CREATED, bufferData);
        
        // Refresh current buffer after creation
        await this.refreshCurrentBuffer();
        
        return bufferId;
      }
      return null;
    } catch (error) {
      console.error('Error creating buffer:', error);
      return null;
    }
  }
  
  /**
   * Delete a buffer by ID
   * @param id - Buffer ID to delete
   * @returns Success status, false if deletion failed
   */
  public async deleteBuffer(id: string): Promise<boolean> {
    try {
      // Get buffer info before deletion if possible
      let bufferInfo: BufferRoute | null = null;
      try {
        // Try to get the buffer info if it's the current one
        const current = await this.getCurrentBuffer();
        if (current && current.id === id) {
          bufferInfo = current;
        }
      } catch (e) {
        // Ignore errors when trying to get buffer info
      }
      
      const success = await this.callLuaMethod<boolean>('delete_buffer', id);
      
      if (success) {
        // Emit event for buffer deletion
        this.emitter.emit(BufferRouter.Events.BUFFER_DELETED, {
          id,
          bufferInfo
        });
        
        // Refresh current buffer after deletion
        await this.refreshCurrentBuffer();
      }
      
      return success;
    } catch (error) {
      console.error('Error deleting buffer:', error);
      return false;
    }
  }
  
  /**
   * Switch to a buffer by ID or path
   * @param identifier - Buffer ID or path
   * @returns Success status
   */
  public async switchBuffer(identifier: string): Promise<boolean> {
    try {
      const success = await this.callLuaMethod<boolean>('switch_buffer', identifier);
      
      if (success) {
        // Emit event for buffer switch
        this.emitter.emit(BufferRouter.Events.BUFFER_SWITCHED, { identifier });
        
        // Get and emit current buffer info after switch
        await this.refreshCurrentBuffer();
      }
      
      return success;
    } catch (error) {
      console.error('Error switching buffer:', error);
      return false;
    }
  }
  
  /**
   * Get current buffer information
   * @returns Current buffer route or null
   */
  public async getCurrentBuffer(): Promise<BufferRoute | null> {
    try {
      return await this.callLuaMethod<BufferRoute | null>('get_current_buffer');
    } catch (error) {
      console.error('Error refreshing current buffer:', error);
      return null;
    }
  }
  
  /**
   * Get information about a specific buffer by ID
   * @param bufferId - The ID of the buffer to get information for
   * @returns Buffer route information or null if not found
   */
  public async getBufferInfo(bufferId: string): Promise<BufferRoute | null> {
    try {
      // Get buffer information from Lua
      const info = await this.callLuaMethod<BufferRoute | null>('get_buffer_info', bufferId);
      
      if (!info) {
        console.warn(`[BufferRouter] No information available for buffer ${bufferId}`);
        return null;
      }
      
      return info;
    } catch (error) {
      console.error(`[BufferRouter] Error getting buffer info for ${bufferId}:`, error);
      return null;
    }
  }

  /**
   * Update the content of a buffer with new lines
   * @param bufferId - Buffer ID
   * @param lines - Array of operations (undefined = keep, null = delete, string = insert/replace)
   * @returns Whether the update was successful
   */
  public async updateBufferContent(bufferId: number, lines: BufferUpdate): Promise<boolean> {
    try {
      // Call the Lua utils render_buffer_diff function to apply the diff
      await this.nvim.lua(`return require('vue-ui.utils.render_buffer').ApplyBufferDiff(${bufferId}, vim.fn.json_decode('${JSON.stringify(lines)}'))`);
      
      // Emit event for buffer update
      this.emitter.emit(BufferRouter.Events.BUFFER_UPDATED, { 
        bufferId, 
        linesUpdated: lines.filter(line => line !== undefined).length 
      });
      
      return true;
    } catch (error) {
      console.error(`Error updating buffer content: ${error}`);
      return false;
    }
  }
  
  /**
   * Subscribe to buffer events
   * @param event - Event name to subscribe to
   * @param listener - Callback function for the event
   * @returns Dispose function to unsubscribe
   */
  public on(event: string, listener: (...args: any[]) => void): Disposable {
    this.emitter.on(event, listener);
    
    return {
      dispose: () => {
        this.emitter.removeListener(event, listener);
      }
    };
  }
  
  /**
   * Get current buffer without triggering reactive updates
   * @returns Current buffer or null if none
   */
  public getCurrentBufferSync(): BufferRoute | null {
    return this.currentBuffer;
  }
  
  /**
   * Dispose of resources
   */
  public dispose(): void {
    // Remove all event listeners
    this.emitter.removeAllListeners();
    
    // Dispose of all disposables
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}

/**
 * Hook for using buffer router in components
 * @param context - Extension context
 * @returns BufferRouter API
 */
export function useBufferRouter(context: ExtensionContext) {
  const router = new BufferRouter(context);
  
  return {
    // Buffer operations
    createBuffer: router.createBuffer.bind(router),
    deleteBuffer: router.deleteBuffer.bind(router),
    switchBuffer: router.switchBuffer.bind(router),
    getCurrentBuffer: router.getCurrentBuffer.bind(router),
    getCurrentBufferSync: router.getCurrentBufferSync.bind(router),
    
    // Event handling
    on: router.on.bind(router),
    events: BufferRouter.Events,
    
    // Cleanup
    dispose: router.dispose.bind(router)
  };
}

// Test utilities - these would typically be in a separate test file

/**
 * Run tests for the BufferRouter
 */
export async function testBufferRouter(context: ExtensionContext): Promise<void> {
  const router = new BufferRouter(context);
  
  // Test createBuffer
  const testCreateBuffer = async () => {
    const path = '/test/typescript/path';
    const query = { foo: 'bar', baz: 'qux' };
    
    const id = await router.createBuffer(path, query);
    console.assert(id, 'Buffer ID should be returned');
    
    if (!id) {
      console.error('Failed to create buffer for testing');
      return false;
    }
    
    // Verify current buffer can be retrieved
    const buffer = await router.getCurrentBuffer();
    console.assert(buffer !== null, 'Current buffer should be retrievable');
    
    await router.deleteBuffer(id);
    
    return true;
  };
  
  // Test deleteBuffer
  const testDeleteBuffer = async () => {
    const id = await router.createBuffer('/test/typescript/delete');
    if (!id) {
      console.error('Failed to create buffer for delete test');
      return false;
    }
    
    const result = await router.deleteBuffer(id);
    console.assert(result, 'Deletion should be successful');
    
    return true;
  };
  
  // Test switchBuffer
  const testSwitchBuffer = async () => {
    const id1 = await router.createBuffer('/test/typescript/switch1');
    if (!id1) {
      console.error('Failed to create first buffer for switch test');
      return false;
    }
    
    const id2 = await router.createBuffer('/test/typescript/switch2', { param: 'value' });
    if (!id2) {
      console.error('Failed to create second buffer for switch test');
      await router.deleteBuffer(id1);
      return false;
    }
    
    // Test switching by ID
    let result = await router.switchBuffer(id1);
    console.assert(result, 'Switch by ID should succeed');
    
    // Test switching by path
    result = await router.switchBuffer('/test/typescript/switch2');
    console.assert(result, 'Switch by path should succeed');
    
    // Clean up
    await router.deleteBuffer(id1);
    await router.deleteBuffer(id2);
    
    return true;
  };
  
  // Test getCurrentBuffer
  const testGetCurrentBuffer = async () => {
    const path = '/test/typescript/current';
    const query = { test: 'value' };
    
    const id = await router.createBuffer(path, query);
    if (!id) {
      console.error('Failed to create buffer for getCurrentBuffer test');
      return false;
    }
    
    const switchResult = await router.switchBuffer(id);
    if (!switchResult) {
      console.error('Failed to switch to buffer for getCurrentBuffer test');
      await router.deleteBuffer(id);
      return false;
    }
    
    const current = await router.getCurrentBuffer();
    console.assert(current, 'Current buffer info should be returned');
    console.assert(current?.id === id, 'Current buffer ID should match');
    console.assert(current?.path === path, 'Current buffer path should match');
    console.assert(current?.query.test === 'value', 'Current buffer query should match');
    
    await router.deleteBuffer(id);
    
    return true;
  };
  
  // Run all tests
  try {
    await testCreateBuffer();
    await testDeleteBuffer();
    await testSwitchBuffer();
    await testGetCurrentBuffer();
    console.log('All BufferRouter TypeScript tests passed!');
  } catch (error) {
    console.error('BufferRouter tests failed:', error);
  } finally {
    router.dispose();
  }
}
