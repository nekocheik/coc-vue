// Mock version of vim-component.ts for testing
import { reactive, effect, ref, watch } from '../../src/reactivity';
import { bridgeCore, BridgeMessage, MessageType } from '../../src/bridge/core';

// Mock workspace from coc.nvim
const workspace = {
  nvim: {
    call: jest.fn(),
    command: jest.fn(),
    createBuffer: jest.fn(),
  },
  onDidOpenTextDocument: jest.fn(),
  onDidChangeTextDocument: jest.fn(),
  onDidCloseTextDocument: jest.fn(),
  registerKeymap: jest.fn(),
};

// Export the same interface as the original VimComponent
export interface ComponentOptions {
  id: string;
  name: string;
  template?: string;
  state?: Record<string, any>;
  methods?: Record<string, Function>;
  setup?: (props: any) => Record<string, any>;
  hooks?: {
    beforeMount?: () => void | Promise<void>;
    onMounted?: () => void | Promise<void>;
    onUpdated?: () => void | Promise<void>;
    onBeforeDestroy?: () => void | Promise<void>;
    onDestroyed?: () => void | Promise<void>;
  };
}

export class VimComponent {
  id: string;
  name: string;
  template: string;
  state: Record<string, any>;
  methods: Record<string, Function>;
  hooks: {
    beforeMount?: () => void | Promise<void>;
    onMounted?: () => void | Promise<void>;
    onUpdated?: () => void | Promise<void>;
    onBeforeDestroy?: () => void | Promise<void>;
    onDestroyed?: () => void | Promise<void>;
  };
  private buffer: number | null = null;
  private window: number | null = null;
  private cleanup: Function[] = [];
  private mounted: boolean = false;
  
  constructor(options: ComponentOptions) {
    this.id = options.id;
    this.name = options.name;
    this.template = options.template || '';
    this.state = reactive(options.state || {});
    this.methods = {};
    this.hooks = options.hooks || {};
    
    // Initialize methods
    if (options.methods) {
      Object.entries(options.methods).forEach(([name, method]) => {
        this.methods[name] = method.bind(this);
      });
    }
    
    // Setup function (similar to Vue 3 Composition API)
    if (options.setup) {
      const setupResult = options.setup.call(this, {});
      if (setupResult) {
        Object.entries(setupResult).forEach(([key, value]) => {
          if (typeof value === 'function') {
            this.methods[key] = value.bind(this);
          } else {
            this.state[key] = value;
          }
        });
      }
    }
  }
  
  async mount(): Promise<void> {
    if (this.mounted) return;
    
    try {
      // Call beforeMount hook
      if (this.hooks.beforeMount) {
        await this.hooks.beforeMount.call(this);
      }
      
      // Create buffer
      this.buffer = 1; // Mock buffer ID
      
      // Create window
      this.window = 1; // Mock window ID
      
      // Set buffer name
      await workspace.nvim.call('nvim_buf_set_name', [this.buffer, `${this.name}: ${this.id}`]);
      
      // Render initial content
      await this.render();
      
      this.mounted = true;
      
      // Call onMounted hook
      if (this.hooks.onMounted) {
        await this.hooks.onMounted.call(this);
      }
    } catch (error) {
      console.error(`Error mounting component ${this.name}:`, error);
      throw error;
    }
  }
  
  async unmount(): Promise<void> {
    if (!this.mounted) return;
    
    try {
      // Call onBeforeDestroy hook
      if (this.hooks.onBeforeDestroy) {
        await this.hooks.onBeforeDestroy.call(this);
      }
      
      // Clean up effects
      this.cleanup.forEach(cleanup => cleanup());
      this.cleanup = [];
      
      // Close window and buffer
      if (this.window) {
        await workspace.nvim.call('nvim_win_close', [this.window, true]);
        this.window = null;
      }
      
      if (this.buffer) {
        await workspace.nvim.call('nvim_buf_delete', [this.buffer, { force: true }]);
        this.buffer = null;
      }
      
      this.mounted = false;
      
      // Call onDestroyed hook
      if (this.hooks.onDestroyed) {
        await this.hooks.onDestroyed.call(this);
      }
    } catch (error) {
      console.error(`Error unmounting component ${this.name}:`, error);
      throw error;
    }
  }
  
  async render(): Promise<void> {
    if (!this.buffer) return;
    
    try {
      // Render template with state
      const lines = this.template.split('\n');
      
      // Update buffer content
      await workspace.nvim.call('nvim_buf_set_lines', [this.buffer, 0, -1, false, lines]);
      
      // Call onUpdated hook
      if (this.hooks.onUpdated) {
        await this.hooks.onUpdated.call(this);
      }
    } catch (error) {
      console.error(`Error rendering component ${this.name}:`, error);
      throw error;
    }
  }
  
  updateState(newState: Record<string, any>): void {
    Object.entries(newState).forEach(([key, value]) => {
      this.state[key] = value;
    });
  }
  
  async callMethod(method: string, ...args: any[]): Promise<any> {
    if (this.methods[method]) {
      return await this.methods[method](...args);
    }
    throw new Error(`Method ${method} not found on component ${this.name}`);
  }
}
