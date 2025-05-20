/**
 * Enhanced mock for VimComponent
 * This mock is cleaner, easier to maintain and test
 */
import { mockNvim, mockWorkspace } from './coc';
import { bridgeCore, MessageType, BridgeMessage } from './bridge-core';

/**
 * Interface for component options
 */
export interface ComponentOptions {
  id: string;
  name?: string;
  type?: string;
  template?: string;
  state?: Record<string, any>;
  methods?: Record<string, Function>;
  setup?: (props: any) => Record<string, any>;
  watch?: Record<string, Function>;
  computed?: Record<string, Function>;
  render?: (state: Record<string, any>) => string[];
  
  // Hooks can be passed directly in options or in a hooks object
  beforeMount?: () => void | Promise<void>;
  onMounted?: () => void | Promise<void>;
  onUpdated?: () => void | Promise<void>;
  onBeforeDestroy?: () => void | Promise<void>;
  onDestroyed?: () => void | Promise<void>;
  
  hooks?: {
    beforeMount?: () => void | Promise<void>;
    onMounted?: () => void | Promise<void>;
    onUpdated?: () => void | Promise<void>;
    onBeforeDestroy?: () => void | Promise<void>;
    onDestroyed?: () => void | Promise<void>;
  };
}

/**
 * Mock implementation of VimComponent
 */
export class VimComponent {
  id: string;
  name: string;
  type: string;
  state: Record<string, any>;
  methods: Record<string, Function>;
  watchers: Record<string, Function>;
  computed: Record<string, Function>;
  template: string;
  renderFn?: (state: Record<string, any>) => string[];
  hooks: {
    beforeMount?: () => void | Promise<void>;
    onMounted?: () => void | Promise<void>;
    onUpdated?: () => void | Promise<void>;
    onBeforeDestroy?: () => void | Promise<void>;
    onDestroyed?: () => void | Promise<void>;
  };
  
  buffer: number | null = null;
  window: number | null = null;
  mounted: boolean = false;
  destroyed: boolean = false;
  
  /**
   * Constructeur du composant
   */
  constructor(options: ComponentOptions) {
    this.id = options.id;
    this.name = options.name || options.id;
    this.type = options.type || 'default';
    this.state = { ...(options.state || {}) };
    this.methods = { ...(options.methods || {}) };
    this.watchers = { ...(options.watch || {}) };
    this.computed = { ...(options.computed || {}) };
    this.template = options.template || '';
    this.renderFn = options.render;
    
    // Fusionner les hooks des options et de l'objet hooks
    this.hooks = {
      beforeMount: options.beforeMount || options.hooks?.beforeMount,
      onMounted: options.onMounted || options.hooks?.onMounted,
      onUpdated: options.onUpdated || options.hooks?.onUpdated,
      onBeforeDestroy: options.onBeforeDestroy || options.hooks?.onBeforeDestroy,
      onDestroyed: options.onDestroyed || options.hooks?.onDestroyed
    };
    
    // Initialiser les propriétés calculées
    this.initComputedProperties();
    
    // Enregistrer le composant auprès du bridge
    this.registerWithBridge();
  }
  
  /**
   * Initialize computed properties
   */
  private initComputedProperties(): void {
    Object.entries(this.computed).forEach(([key, computeFn]) => {
      if (typeof computeFn === 'function') {
        Object.defineProperty(this.state, key, {
          get: () => computeFn.call(this),
          enumerable: true
        });
      }
    });
  }
  
  /**
   * Register component with bridge
   */
  private registerWithBridge(): void {
    bridgeCore.registerHandler(this.id, async (message: BridgeMessage) => {
      if (message.action === 'callMethod' && message.payload && message.payload.method) {
        try {
          const result = await this.callMethod(
            message.payload.method,
            ...(message.payload.args || [])
          );
          
          // Send response
          await bridgeCore.sendMessage({
            id: message.id,
            type: MessageType.RESPONSE,
            action: 'methodResult',
            correlationId: message.correlationId,
            payload: { result }
          });
        } catch (error) {
          // Send error
          await bridgeCore.sendMessage({
            id: message.id,
            type: MessageType.ERROR,
            action: 'methodError',
            correlationId: message.correlationId,
            payload: { error: error instanceof Error ? error.message : String(error) }
          });
        }
      }
    });
  }
  
  /**
   * Mount component
   */
  async mount(): Promise<void> {
    if (this.mounted) return;
    
    try {
      // Call beforeMount hook
      if (this.hooks.beforeMount) {
        await this.hooks.beforeMount.call(this);
      }
      
      // Create buffer - Explicitly simulate call for tests
      mockNvim.call.mockImplementationOnce(() => Promise.resolve(1));
      this.buffer = await mockWorkspace.nvim.call('nvim_create_buf', [false, true]);
      
      // Create window
      mockNvim.call.mockImplementationOnce(() => Promise.resolve(2));
      this.window = await mockWorkspace.nvim.call('nvim_open_win', [
        this.buffer, 
        false, 
        {
          relative: 'editor',
          width: 60,
          height: 10,
          col: 10,
          row: 7,
          style: 'minimal',
          border: 'rounded'
        }
      ]);
      
      // Set buffer name
      await mockWorkspace.nvim.call('nvim_buf_set_name', [this.buffer, `${this.name}: ${this.id}`]);
      
      // Render initial content
      await this.render();
      
      this.mounted = true;
      
      // Call onMounted hook
      if (this.hooks.onMounted) {
        await this.hooks.onMounted.call(this);
      }
      
      // Send mounted event
      await bridgeCore.sendMessage({
        id: this.id,
        type: MessageType.EVENT,
        action: 'component:mounted'
      });
    } catch (error) {
      console.error(`Error mounting component ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Render component
   */
  async render(): Promise<void> {
    if (!this.buffer) return;
    
    try {
      let lines: string[] = [];
      
      // Use render function if provided
      if (this.renderFn) {
        lines = this.renderFn(this.state);
      } else if (this.template) {
        // Fallback to template
        lines = this.template.split('\n');
      }
      
      // Update buffer content - explicitly simulate for tests
      mockNvim.call.mockImplementationOnce(() => Promise.resolve());
      await mockWorkspace.nvim.call('nvim_buf_set_lines', [this.buffer, 0, -1, false, lines]);
      
      // Call onUpdated hook
      if (this.hooks.onUpdated) {
        await this.hooks.onUpdated.call(this);
      }
    } catch (error) {
      console.error(`Error rendering component ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Update component state
   */
  async updateState(newState: Record<string, any>): Promise<void> {
    // Save old values for watchers
    const oldValues: Record<string, any> = {};
    Object.keys(newState).forEach(key => {
      oldValues[key] = this.state[key];
    });
    
    // Update state
    Object.entries(newState).forEach(([key, value]) => {
      this.state[key] = value;
    });
    
    // Call watchers for modified properties
    for (const [key, watcher] of Object.entries(this.watchers)) {
      if (key in newState && typeof watcher === 'function') {
        await watcher.call(this, newState[key], oldValues[key]);
      }
    }
    
    // Re-render component
    await this.render();
    
    // Send state updated event
    await bridgeCore.sendMessage({
      id: this.id,
      type: MessageType.STATE,
      action: 'component:stateUpdated',
      payload: { state: this.state }
    });
  }
  
  /**
   * Call component method
   */
  async callMethod(methodName: string, ...args: any[]): Promise<any> {
    const method = this.methods[methodName];
    if (!method || typeof method !== 'function') {
      throw new Error(`Method '${methodName}' not found on component ${this.id}`);
    }
    
    return method.apply(this, args);
  }
  
  /**
   * Destroy component
   */
  async destroy(): Promise<void> {
    if (this.destroyed) return;
    
    try {
      // Call onBeforeDestroy hook
      if (this.hooks.onBeforeDestroy) {
        await this.hooks.onBeforeDestroy.call(this);
      }
      
      // Close window
      if (this.window) {
        await mockWorkspace.nvim.call('nvim_win_close', [this.window, true]);
      }
      
      // Delete buffer
      if (this.buffer) {
        await mockWorkspace.nvim.command(`silent! bdelete! ${this.buffer}`);
      }
      
      this.destroyed = true;
      this.mounted = false;
      
      // Unregister from bridge
      bridgeCore.unregisterHandler(this.id);
      
      // Call onDestroyed hook
      if (this.hooks.onDestroyed) {
        await this.hooks.onDestroyed.call(this);
      }
      
      // Send destroyed event
      await bridgeCore.sendMessage({
        id: this.id,
        type: MessageType.EVENT,
        action: 'component:destroyed'
      });
    } catch (error) {
      console.error(`Error destroying component ${this.name}:`, error);
      throw error;
    }
  }
}
