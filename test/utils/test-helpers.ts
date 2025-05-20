/**
 * Robust test utilities
 * These functions help simplify test writing and reduce code duplication
 */
import { NeovimClient, ComponentConfig } from './neovim-client';

// Default options for components
const defaultOptions = {
  title: 'Test Component',
  width: 40,
  height: 10,
  style: 'default',
  enabled: true,
  visible: true
};

/**
 * Helper class for component testing
 * Provides methods to interact with components and verify their state
 */
export class ComponentTestHelper {
  private client: NeovimClient | null = null;
  private currentComponent: any = null;
  private componentType: string;

  constructor(componentType: string) {
    this.componentType = componentType;
  }

  /**
   * Connect to Neovim server with error handling
   */
  public async connect(): Promise<void> {
    try {
      this.client = await NeovimClient.getInstance();
      await this.client.connect();
    } catch (error) {
      console.error('Error connecting to Neovim server:', error);
      throw error;
    }
  }

  /**
   * Create a component with custom options
   */
  public async createComponent(customOptions: any = {}): Promise<void> {
    try {
      // Generate unique ID to avoid conflicts
      const id = `test_${this.componentType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Merge default options with custom options
      const options = {
        ...defaultOptions,
        ...customOptions,
        id
      };

      // Create component using bridge
      this.currentComponent = await this.client?.createComponent(this.componentType, options);

      if (!this.currentComponent) {
        throw new Error('Component creation failed');
      }
    } catch (error) {
      console.error('Error creating component:', error);
      throw error;
    }
  }

  /**
   * Call a method on current component with error handling
   */
  public async callMethod(method: string, ...args: any[]): Promise<any> {
    if (!this.currentComponent) {
      throw new Error('No component created. Call createComponent() first.');
    }

    try {
      return await this.currentComponent[method](...args);
    } catch (error) {
      console.error(`Error calling method ${method}:`, error);
      throw error;
    }
  }

  /**
   * Get current component state with error handling
   */
  public async getState(): Promise<any> {
    if (!this.currentComponent) {
      throw new Error('No component created. Call createComponent() first.');
    }

    try {
      return await this.currentComponent.getState();
    } catch (error) {
      console.error('Error getting component state:', error);
      throw error;
    }
  }

  /**
   * Get events with error handling
   */
  public async getEvents(): Promise<any[]> {
    try {
      return await this.client?.getEvents() || [];
    } catch (error) {
      console.error('Error getting events:', error);
      throw error;
    }
  }

  /**
   * Wait for a condition to be met on component state
   */
  public async waitForState(predicate: (state: any) => boolean, timeout = 5000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const state = await this.getState();
      if (predicate(state)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }

  /**
   * Mount the component (call mount method)
   */
  public async mount(): Promise<void> {
    await this.callMethod('mount');
  }

  /**
   * Unmount the component (call unmount method)
   */
  public async unmount(): Promise<void> {
    await this.callMethod('unmount');
  }
}

/**
 * Utility function to run a test with automatic connection management
 * This function handles connection, component creation and disconnection
 */
export async function runComponentTest(
  componentType: string,
  testFn: (helper: ComponentTestHelper) => Promise<void>,
  options: any = {}
): Promise<void> {
  const helper = new ComponentTestHelper(componentType);

  try {
    await helper.connect();
    await helper.createComponent(options);
    await testFn(helper);
  } finally {
    await helper.unmount();
  }
}

/**
 * Function to simplify state assertions
 * Verifies that component state matches expected values
 */
export async function assertState(component: any, expectedState: any): Promise<void> {
  const state = await component.getState();
  expect(state).toMatchObject(expectedState);
}

/**
 * Function to wait for a condition with timeout
 */
export async function waitForCondition(
  condition: () => Promise<boolean> | boolean,
  timeout = 5000,
  errorMessage = 'Condition not met within timeout'
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(errorMessage);
}
