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

// Export the mock nvim for tests to use
export const mockNvim = workspace.nvim;

// Export the same interface as the original VimComponent
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
  private renderFn?: (state: Record<string, any>) => string[];
  private watchers: Record<string, Function> = {};
  private computed: Record<string, Function> = {};
  private type: string = '';

  constructor(options: ComponentOptions) {
    this.id = options.id;
    this.name = options.name || '';
    this.type = options.type || '';
    this.template = options.template || '';
    this.state = reactive(options.state || {});
    this.methods = {};
    
    // Initialize hooks - support both direct hooks and hooks object
    this.hooks = options.hooks || {};
    
    // Support hooks passed directly in options
    if (options.beforeMount) this.hooks.beforeMount = options.beforeMount;
    if (options.onMounted) this.hooks.onMounted = options.onMounted;
    if (options.onUpdated) this.hooks.onUpdated = options.onUpdated;
    if (options.onBeforeDestroy) this.hooks.onBeforeDestroy = options.onBeforeDestroy;
    if (options.onDestroyed) this.hooks.onDestroyed = options.onDestroyed;
    
    this.renderFn = options.render;
    
    // Reset mock call history for testing
    mockNvim.call.mockClear();
    
    // Initialize methods
    if (options.methods) {
      Object.entries(options.methods).forEach(([name, method]) => {
        this.methods[name] = method.bind(this);
      });
    }

    // Initialize watchers
    if (options.watch) {
      this.watchers = options.watch;
    }

    // Initialize computed properties
    if (options.computed) {
      this.computed = options.computed;
      // Add computed properties to state
      Object.entries(this.computed).forEach(([key, computeFn]) => {
        Object.defineProperty(this.state, key, {
          get: () => computeFn.call(this),
          enumerable: true
        });
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
      
      // Create buffer - Explicitly mock the call for testing
      mockNvim.call.mockImplementationOnce(() => Promise.resolve(1));
      this.buffer = await workspace.nvim.call('nvim_create_buf', [false, true]);
      
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
      
      // Call onUpdated hook after initial render
      if (this.hooks.onUpdated) {
        await this.hooks.onUpdated.call(this);
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
      let lines: string[] = [];

      // Use render function if provided
      if (this.renderFn) {
        lines = this.renderFn(this.state);
      } else {
        // Fallback to template
        lines = this.template.split('\n');
      }

      // Update buffer content - explicitly mock for testing
      mockNvim.call.mockImplementationOnce(() => Promise.resolve());
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

  async updateState(newState: Record<string, any>): Promise<void> {
    // Store old values for watchers
    const oldValues: Record<string, any> = {};

    // Collect keys that will be updated and their old values
    Object.keys(newState).forEach(key => {
      oldValues[key] = this.state[key];
    });

    // Update state
    Object.entries(newState).forEach(([key, value]) => {
      this.state[key] = value;
    });

    // Call watchers for changed properties
    for (const [key, watcher] of Object.entries(this.watchers)) {
      if (key in newState && typeof watcher === 'function') {
        watcher.call(this, newState[key], oldValues[key]);
      }
    }

    // Re-render the component
    if (this.mounted) {
      await this.render();
    }
  }

  async callMethod(method: string, ...args: any[]): Promise<any> {
    if (this.methods[method]) {
      return await this.methods[method](...args);
    }
    throw new Error(`Method ${method} not found on component ${this.name}`);
  }

  isOpen(): boolean {
    return this.state.isOpen || false;
  }

  get selectedOptionIndex(): number {
    return this.state.selectedOptionIndex || -1;
  }

  get selectedValue(): any {
    return this.state.selectedValue;
  }

  get selectedText(): string {
    return this.state.selectedText || '';
  }
}
