// src/components/vim-component.ts
import { workspace } from 'coc.nvim';
import { reactive, effect, ref, watch } from '../reactivity';
import { bridgeCore, BridgeMessage, MessageType } from '../bridge/core';

/**
 * Lifecycle hook types
 */
export type LifecycleHook = () => void | Promise<void>;

/**
 * Component options interface
 */
export interface ComponentOptions {
  id: string;
  type: string;
  props?: Record<string, any>;
  state?: Record<string, any>;
  bufferOptions?: BufferOptions;
  onMounted?: LifecycleHook;
  beforeMount?: LifecycleHook;
  onUpdated?: LifecycleHook;
  onDestroyed?: LifecycleHook;
  onBeforeDestroy?: LifecycleHook;
  methods?: Record<string, (...args: any[]) => any>;
  computed?: Record<string, () => any>;
  watch?: Record<string, (newValue: any, oldValue: any) => void>;
  render?: (state: any) => string[];
}

/**
 * Buffer options interface
 */
export interface BufferOptions {
  name?: string;
  filetype?: string;
  buflisted?: boolean;
  modifiable?: boolean;
  readonly?: boolean;
  scratch?: boolean;
  width?: number;
  height?: number;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'floating';
  focusOnCreate?: boolean;
}

/**
 * Default buffer options
 */
const DEFAULT_BUFFER_OPTIONS: BufferOptions = {
  buflisted: false,
  modifiable: false,
  readonly: true,
  scratch: true,
  focusOnCreate: true,
  position: 'floating',
  width: 60,
  height: 10
};

/**
 * VimComponent class - Vue-like component for Vim buffers
 */
export class VimComponent {
  private _id: string;
  private _type: string;
  private _props: Record<string, any>;
  private _state: Record<string, any>;
  private _methods: Record<string, (...args: any[]) => any> = {};
  private _computed: Record<string, () => any> = {};
  private _watchers: Array<() => void> = [];
  private _bufferOptions: BufferOptions;
  private _buffer: number | null = null;
  private _window: number | null = null;
  private _isMounted: boolean = false;
  private _isDestroyed: boolean = false;
  private _renderFunction: ((state: any) => string[]) | null = null;
  
  // Lifecycle hooks
  private _beforeMount: LifecycleHook | null = null;
  private _onMounted: LifecycleHook | null = null;
  private _onUpdated: LifecycleHook | null = null;
  private _onBeforeDestroy: LifecycleHook | null = null;
  private _onDestroyed: LifecycleHook | null = null;
  
  // Reactivity tracking
  private _effectStopFns: Array<() => void> = [];
  
  /**
   * Constructor
   * @param options Component options
   */
  constructor(options: ComponentOptions) {
    this._id = options.id;
    this._type = options.type;
    this._props = reactive(options.props || {});
    this._state = reactive(options.state || {});
    this._bufferOptions = { ...DEFAULT_BUFFER_OPTIONS, ...options.bufferOptions };
    
    // Set up lifecycle hooks
    this._beforeMount = options.beforeMount || null;
    this._onMounted = options.onMounted || null;
    this._onUpdated = options.onUpdated || null;
    this._onBeforeDestroy = options.onBeforeDestroy || null;
    this._onDestroyed = options.onDestroyed || null;
    
    // Set up methods
    if (options.methods) {
      Object.entries(options.methods).forEach(([name, method]) => {
        this._methods[name] = method.bind(this);
      });
    }
    
    // Set up computed properties
    if (options.computed) {
      Object.entries(options.computed).forEach(([name, getter]) => {
        const boundGetter = getter.bind(this);
        Object.defineProperty(this._state, name, {
          get: boundGetter,
          enumerable: true
        });
        this._computed[name] = boundGetter;
      });
    }
    
    // Set up watchers
    if (options.watch) {
      Object.entries(options.watch).forEach(([path, callback]) => {
        const boundCallback = callback.bind(this);
        const stop = watch(
          () => this.getNestedProperty(this._state, path),
          (newVal, oldVal) => boundCallback(newVal, oldVal)
        );
        this._watchers.push(stop);
      });
    }
    
    // Set up render function
    this._renderFunction = options.render || null;
    
    // Set up reactivity for rendering
    if (this._renderFunction) {
      const stopEffect = effect(() => {
        if (this._isMounted) {
          this.updateBuffer();
        }
      });
      this._effectStopFns.push(stopEffect);
    }
    
    // Register message handlers
    this.registerMessageHandlers();
  }
  
  /**
   * Get a nested property from an object using a path string
   * @param obj Object to get property from
   * @param path Path to property (e.g. 'user.profile.name')
   * @returns Property value
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((prev, curr) => {
      return prev && prev[curr];
    }, obj);
  }
  
  /**
   * Register message handlers for bridge communication
   */
  private registerMessageHandlers(): void {
    // Register handler for component-specific messages
    bridgeCore.registerHandler(`component:${this._id}`, async (message: BridgeMessage) => {
      if (message.id !== this._id) return;
      
      if (message.type === MessageType.ACTION) {
        // Handle method calls
        if (message.action === 'callMethod' && message.payload?.method) {
          const { method, args = [] } = message.payload;
          if (this._methods[method]) {
            try {
              const result = await this._methods[method](...args);
              
              // Send response back
              await bridgeCore.sendMessage({
                id: this._id,
                type: MessageType.RESPONSE,
                action: 'methodResult',
                payload: {
                  method,
                  result
                },
                correlationId: message.correlationId
              });
            } catch (error) {
              console.error(`Error calling method ${method}:`, error);
              
              // Send error response
              await bridgeCore.sendMessage({
                id: this._id,
                type: MessageType.ERROR,
                action: 'methodError',
                payload: {
                  method,
                  error: error instanceof Error ? error.message : String(error)
                },
                correlationId: message.correlationId
              });
            }
          }
        }
        
        // Handle state updates
        if (message.action === 'updateState' && message.payload?.updates) {
          const { updates } = message.payload;
          Object.entries(updates).forEach(([key, value]) => {
            if (key in this._state) {
              this._state[key] = value;
            }
          });
        }
      }
    });
  }
  
  /**
   * Mount the component to a Vim buffer
   */
  async mount(): Promise<void> {
    if (this._isMounted || this._isDestroyed) return;
    
    // Call beforeMount hook
    if (this._beforeMount) {
      await this._beforeMount();
    }
    
    // Create buffer
    await this.createBuffer();
    
    // Mark as mounted
    this._isMounted = true;
    
    // Call onMounted hook
    if (this._onMounted) {
      await this._onMounted();
    }
    
    // Notify TypeScript side that component is mounted
    await bridgeCore.sendMessage({
      id: this._id,
      type: MessageType.EVENT,
      action: 'component:mounted',
      payload: {
        type: this._type,
        bufferId: this._buffer,
        windowId: this._window
      }
    });
  }
  
  /**
   * Create a new buffer for the component
   */
  private async createBuffer(): Promise<void> {
    const nvim = workspace.nvim;
    
    // Generate buffer name
    const bufferName = this._bufferOptions.name || `${this._type}_${this._id}`;
    
    // Create buffer
    const buffer = await nvim.call('nvim_create_buf', [false, true]);
    this._buffer = buffer;
    
    // Set buffer options
    await nvim.call('nvim_buf_set_name', [buffer, bufferName]);
    
    if (this._bufferOptions.filetype) {
      await nvim.command(`call setbufvar(${buffer}, '&filetype', '${this._bufferOptions.filetype}')`);
    }
    
    await nvim.command(`call setbufvar(${buffer}, '&buflisted', ${this._bufferOptions.buflisted ? 1 : 0})`);
    await nvim.command(`call setbufvar(${buffer}, '&modifiable', ${this._bufferOptions.modifiable ? 1 : 0})`);
    await nvim.command(`call setbufvar(${buffer}, '&readonly', ${this._bufferOptions.readonly ? 1 : 0})`);
    
    // Create window based on position
    const { width, height, position } = this._bufferOptions;
    
    if (position === 'floating') {
      // Calculate floating window position
      const columns = await nvim.getOption('columns') as number;
      const lines = await nvim.getOption('lines') as number;
      const winWidth = Math.min(width || 60, columns - 4);
      const winHeight = Math.min(height || 10, lines - 4);
      
      const col = Math.floor((columns - winWidth) / 2);
      const row = Math.floor((lines - winHeight) / 2);
      
      // Create floating window
      const window = await nvim.call('nvim_open_win', [
        buffer,
        this._bufferOptions.focusOnCreate || false,
        {
          relative: 'editor',
          width: winWidth,
          height: winHeight,
          col,
          row,
          style: 'minimal',
          border: 'rounded'
        }
      ]);
      
      this._window = window;
    } else {
      // Create split window
      const splitCmd = position === 'top' ? 'topleft'
        : position === 'bottom' ? 'botright'
        : position === 'left' ? 'vertical topleft'
        : position === 'right' ? 'vertical botright'
        : '';
      
      const sizePrefix = position === 'left' || position === 'right' ? 'vertical ' : '';
      const sizeValue = position === 'left' || position === 'right' ? width : height;
      
      await nvim.command(`${splitCmd} ${sizePrefix}${sizeValue || ''}split`);
      const window = await nvim.call('nvim_get_current_win', []);
      await nvim.call('nvim_win_set_buf', [window, buffer]);
      this._window = window;
      
      if (!this._bufferOptions.focusOnCreate) {
        await nvim.command('wincmd p');
      }
    }
    
    // Initial render
    await this.updateBuffer();
  }
  
  /**
   * Update the buffer content
   */
  async updateBuffer(): Promise<void> {
    if (!this._isMounted || !this._buffer || !this._renderFunction) return;
    
    const nvim = workspace.nvim;
    
    // Make buffer modifiable
    await nvim.command(`call setbufvar(${this._buffer}, '&modifiable', 1)`);
    
    // Render content
    const content = this._renderFunction(this._state);
    
    // Update buffer content
    await nvim.call('nvim_buf_set_lines', [this._buffer, 0, -1, false, content]);
    
    // Make buffer non-modifiable again if needed
    if (this._bufferOptions.modifiable === false) {
      await nvim.command(`call setbufvar(${this._buffer}, '&modifiable', 0)`);
    }
    
    // Call onUpdated hook
    if (this._onUpdated) {
      await this._onUpdated();
    }
    
    // Notify TypeScript side that component was updated
    await bridgeCore.sendMessage({
      id: this._id,
      type: MessageType.EVENT,
      action: 'component:updated',
      payload: {
        type: this._type
      }
    });
  }
  
  /**
   * Destroy the component
   */
  async destroy(): Promise<void> {
    if (this._isDestroyed) return;
    
    // Call onBeforeDestroy hook
    if (this._onBeforeDestroy) {
      await this._onBeforeDestroy();
    }
    
    // Stop all reactivity
    this._effectStopFns.forEach(stop => stop());
    this._watchers.forEach(stop => stop());
    
    // Close window and delete buffer
    if (this._window) {
      const nvim = workspace.nvim;
      try {
        await nvim.call('nvim_win_close', [this._window, true]);
      } catch (error) {
        console.error('Error closing window:', error);
      }
    }
    
    if (this._buffer) {
      const nvim = workspace.nvim;
      try {
        await nvim.command(`silent! bdelete! ${this._buffer}`);
      } catch (error) {
        console.error('Error deleting buffer:', error);
      }
    }
    
    // Unregister message handlers
    bridgeCore.unregisterHandler(`component:${this._id}`, async () => {});
    
    // Mark as destroyed
    this._isMounted = false;
    this._isDestroyed = true;
    
    // Call onDestroyed hook
    if (this._onDestroyed) {
      await this._onDestroyed();
    }
    
    // Notify TypeScript side that component was destroyed
    await bridgeCore.sendMessage({
      id: this._id,
      type: MessageType.EVENT,
      action: 'component:destroyed',
      payload: {
        type: this._type
      }
    });
  }
  
  /**
   * Call a method on the component
   * @param method Method name
   * @param args Method arguments
   * @returns Method result
   */
  async callMethod(method: string, ...args: any[]): Promise<any> {
    if (this._isDestroyed) {
      throw new Error('Cannot call method on destroyed component');
    }
    
    if (this._methods[method]) {
      return this._methods[method](...args);
    }
    
    throw new Error(`Method ${method} not found`);
  }
  
  /**
   * Update component state
   * @param updates State updates
   */
  updateState(updates: Record<string, any>): void {
    if (this._isDestroyed) {
      throw new Error('Cannot update state of destroyed component');
    }
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key in this._state) {
        this._state[key] = value;
      }
    });
  }
  
  /**
   * Get component ID
   */
  get id(): string {
    return this._id;
  }
  
  /**
   * Get component type
   */
  get type(): string {
    return this._type;
  }
  
  /**
   * Get component state
   */
  get state(): Record<string, any> {
    return this._state;
  }
  
  /**
   * Get component props
   */
  get props(): Record<string, any> {
    return this._props;
  }
  
  /**
   * Check if component is mounted
   */
  get isMounted(): boolean {
    return this._isMounted;
  }
  
  /**
   * Check if component is destroyed
   */
  get isDestroyed(): boolean {
    return this._isDestroyed;
  }
  
  /**
   * Get buffer ID
   */
  get buffer(): number | null {
    return this._buffer;
  }
  
  /**
   * Get window ID
   */
  get window(): number | null {
    return this._window;
  }
}
