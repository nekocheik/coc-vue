/**
 * Component Test Context
 * 
 * This file provides a context for testing Vue UI components in coc-vue.
 * It simulates the bridge between TypeScript and Lua components.
 */

import { EventEmitter } from 'events';

/**
 * Interface for component state
 */
export interface ComponentState {
  id: string;
  title?: string;
  is_open?: boolean;
  options?: Array<{
    id: string;
    text: string;
    value: string;
  }>;
  [key: string]: any;
}

/**
 * Component Test Context class
 * Provides a simulated environment for testing components
 */
export class ComponentTestContext {
  private events = new EventEmitter();
  private state: ComponentState;
  private componentType: string;

  /**
   * Creates a new component test context
   * 
   * @param componentType The type of component to test (e.g., 'select', 'button')
   * @param initialState Initial state for the component
   */
  constructor(componentType: string, initialState: Partial<ComponentState> = {}) {
    this.componentType = componentType;
    this.state = {
      id: `test_${componentType}_${Date.now()}`,
      ...initialState,
    };
  }

  /**
   * Gets the current state of the component
   * 
   * @returns The current component state
   */
  getState(): ComponentState {
    return { ...this.state };
  }

  /**
   * Updates the component state
   * 
   * @param newState Partial state to merge with the current state
   */
  setState(newState: Partial<ComponentState>): void {
    this.state = {
      ...this.state,
      ...newState,
    };
    this.emit('state:updated', this.state);
  }

  /**
   * Simulates a component event
   * 
   * @param eventName Name of the event to emit
   * @param data Data to include with the event
   */
  emit(eventName: string, data: any = {}): void {
    const eventData = {
      ...data,
      id: this.state.id,
      timestamp: Math.floor(Date.now() / 1000),
    };
    this.events.emit(eventName, eventData);
    this.events.emit('*', eventName, eventData);
  }

  /**
   * Registers an event listener
   * 
   * @param eventName Name of the event to listen for
   * @param callback Callback function to execute when the event occurs
   */
  on(eventName: string, callback: (data: any) => void): void {
    this.events.on(eventName, callback);
  }

  /**
   * Simulates opening a component
   */
  open(): void {
    this.setState({ is_open: true });
    this.emit(`${this.componentType}:opened`, { config: this.state });
  }

  /**
   * Simulates closing a component
   */
  close(): void {
    this.setState({ is_open: false });
    this.emit(`${this.componentType}:closed`);
  }

  /**
   * Simulates component creation
   */
  create(): void {
    this.emit('component:created', {
      component_type: this.componentType,
      title: this.state.title,
      config: this.state,
    });
  }

  /**
   * Simulates component destruction
   */
  destroy(): void {
    this.emit('component:destroyed');
    this.events.removeAllListeners();
  }
}

/**
 * Creates a component test context and executes a test function
 * 
 * @param componentType The type of component to test
 * @param testFn The test function to execute with the context
 * @param initialState Optional initial state for the component
 */
export async function withComponentContext(
  componentType: string,
  testFn: (context: ComponentTestContext) => Promise<void>,
  initialState: Partial<ComponentState> = {}
): Promise<void> {
  const context = new ComponentTestContext(componentType, initialState);
  try {
    await testFn(context);
  } finally {
    context.destroy();
  }
}
