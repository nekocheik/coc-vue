/**
 * Test utilities
 * These functions help simplify test writing and reduce code duplication
 */
import { NeovimClient, ComponentConfig } from './neovim-client';

// Default options for components
export const DEFAULT_OPTIONS: Record<string, Record<string, any>> = {
  SELECT: {
    title: 'Test Select',
    options: [
      { id: 'opt1', text: 'Option 1', value: 'value1' },
      { id: 'opt2', text: 'Option 2', value: 'value2' },
      { id: 'opt3', text: 'Option 3', value: 'value3' }
    ],
    style: 'default',
    placeholder: 'Select an option...',
    disabled: false,
    required: false,
    multi: false,
    maxVisibleOptions: 5
  }
};

// Helper class for component testing
export class ComponentTestHelper {
  private client: NeovimClient;
  private componentId: string | null = null;
  private componentType: string;
  
  constructor(componentType: string) {
    this.client = NeovimClient.getInstance();
    this.componentType = componentType;
  }
  
  /**
   * Connect to Neovim server
   */
  async connect(): Promise<void> {
    await this.client.connect();
    const isAlive = await this.client.ping();
    if (!isAlive) {
      throw new Error('Failed to connect to Neovim server - ping failed');
    }
  }
  
  /**
   * Create a component with custom options
   */
  async createComponent(options: Partial<ComponentConfig> = {}): Promise<string> {
    // Generate unique ID to avoid conflicts
    const id = `test_${this.componentType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Merge default options with custom options
    const config = {
      id,
      ...DEFAULT_OPTIONS[this.componentType.toUpperCase()] || {},
      ...options
    };
    
    this.componentId = await this.client.loadComponent(config);
    return this.componentId;
  }
  
  /**
   * Call a method on the current component
   */
  async callMethod(method: string, ...args: any[]): Promise<any> {
    if (!this.componentId) {
      throw new Error('No component created. Call createComponent() first.');
    }
    return this.client.callMethod(this.componentId, method, ...args);
  }
  
  /**
   * Get current component state
   */
  async getState(): Promise<any> {
    if (!this.componentId) {
      throw new Error('No component created. Call createComponent() first.');
    }
    return this.client.getState(this.componentId);
  }
  
  /**
   * Get captured events
   */
  async getEvents(): Promise<any[]> {
    return this.client.getEvents();
  }
  
  /**
   * Wait for a condition to be met on component state
   */
  async waitForState(predicate: (state: any) => boolean, timeout = 5000): Promise<any> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const state = await this.getState();
      if (predicate(state)) {
        return state;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`State condition not met after ${timeout}ms`);
  }
  
  /**
   * Wait for a specific event to be emitted
   */
  async waitForEvent(eventType: string, timeout = 5000): Promise<any> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const events = await this.getEvents();
      const event = events.find(e => e.type === eventType && e.id === this.componentId);
      if (event) {
        return event;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Event ${eventType} not received after ${timeout}ms`);
  }
  
  /**
   * Disconnect from Neovim server
   */
  disconnect(): void {
    this.client.disconnect();
  }
}

// Utility function to run a test with automatic connection management
export async function withComponent(
  componentType: string,
  testFn: (helper: ComponentTestHelper) => Promise<void>,
  options: Partial<ComponentConfig> = {}
): Promise<void> {
  const helper = new ComponentTestHelper(componentType);
  
  try {
    await helper.connect();
    await helper.createComponent(options);
    await testFn(helper);
  } finally {
    helper.disconnect();
  }
}

// Function to simplify state assertions
export function expectState(state: any, expected: Partial<any>): void {
  Object.entries(expected).forEach(([key, value]) => {
    expect(state[key]).toEqual(value);
  });
}
