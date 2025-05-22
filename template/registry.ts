/**
 * Component Registry System
 * 
 * This module provides a registry for tracking component instances
 * and emitting events when components are added, updated, or removed.
 * 
 * It serves as the central hub for component management in the reactive system.
 */

// Component interfaces
export interface Component {
  id: string;
  type: string;
  props: Record<string, any>;
  children?: Component[];
}

// Event types for the registry
type RegistryEventType = 
  | 'componentAdded'
  | 'componentUpdated'
  | 'componentRemoved'
  | 'registryCleared';

// Event listener type
type EventListener<T = any> = (data: T, ...args: any[]) => void;

/**
 * Registry for tracking components and their state
 */
export class ComponentRegistry {
  private components: Map<string, Component> = new Map();
  private eventListeners: Map<string, Set<EventListener>> = new Map();
  
  /**
   * Add a component to the registry
   * 
   * @param component The component to add
   */
  public add(component: Component): void {
    // Store the component
    this.components.set(component.id, component);
    
    // Emit event
    this.emit('componentAdded', component);
  }
  
  /**
   * Get a component by its ID
   * 
   * @param id The component ID
   * @returns The component or null if not found
   */
  public get(id: string): Component | null {
    return this.components.get(id) || null;
  }
  
  /**
   * Remove a component from the registry
   * 
   * @param id The ID of the component to remove
   */
  public remove(id: string): void {
    // Check if component exists
    if (!this.components.has(id)) {
      return;
    }
    
    // Remove the component
    this.components.delete(id);
    
    // Emit event
    this.emit('componentRemoved', id);
  }
  
  /**
   * Update a component in the registry
   * 
   * @param component The updated component
   */
  public update(component: Component): void {
    // Get the old component for comparison
    const oldComponent = this.components.get(component.id);
    
    // Update the component
    this.components.set(component.id, component);
    
    // Emit event with old and new values
    this.emit('componentUpdated', component, oldComponent);
  }
  
  /**
   * Get all components of a specific type
   * 
   * @param type The component type
   * @returns Array of components of the specified type
   */
  public getByType(type: string): Component[] {
    const result: Component[] = [];
    
    this.components.forEach(component => {
      if (component.type === type) {
        result.push(component);
      }
    });
    
    return result;
  }
  
  /**
   * Clear all components from the registry
   */
  public clear(): void {
    this.components.clear();
    this.emit('registryCleared');
  }
  
  /**
   * Register an event listener
   * 
   * @param event The event type
   * @param listener The listener function
   * @returns A function to remove the listener
   */
  public on(event: RegistryEventType, listener: EventListener): () => void {
    // Get or create listener set for this event
    let listeners = this.eventListeners.get(event);
    if (!listeners) {
      listeners = new Set();
      this.eventListeners.set(event, listeners);
    }
    
    // Add the listener
    listeners.add(listener);
    
    // Return a function to remove the listener
    return () => {
      const listenerSet = this.eventListeners.get(event);
      if (listenerSet) {
        listenerSet.delete(listener);
      }
    };
  }
  
  /**
   * Emit an event to all registered listeners
   * 
   * @param event The event type
   * @param data The event data
   * @param args Additional arguments
   */
  private emit(event: RegistryEventType, data?: any, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;
    
    listeners.forEach(listener => {
      listener(data, ...args);
    });
  }
}

/**
 * Create and export a singleton instance of the registry
 */
export const componentRegistry = new ComponentRegistry();
