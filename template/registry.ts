/**
 * Component Registry System
 * 
 * This module provides a registry for tracking component instances
 * and emitting events when components are added, updated, or removed.
 * 
 * It also manages lifecycle hooks for components (onMount, onUpdate, onUnmount)
 * and event listeners, serving as the central hub for component management.
 */

// Component interfaces
export interface Component {
  id: string;
  type: string;
  props: Record<string, any>;
  children?: Component[];
}

// Lifecycle hook types
export type OnMountHook = () => void;
export type OnUpdateHook = (newVNode: any, oldVNode?: any) => void;
export type OnUnmountHook = () => void;
export type EventHandler = (eventData: any) => void;

// Component lifecycle data
export interface ComponentLifecycle {
  id: string;
  onMount?: OnMountHook;
  onUpdate?: OnUpdateHook;
  onUnmount?: OnUnmountHook;
  events?: Record<string, EventHandler>;
  isMounted: boolean;
  lastVNode?: any;
}

// Event types for the registry
export enum RegistryEventType {
  COMPONENT_ADDED = 'componentAdded',
  COMPONENT_REMOVED = 'componentRemoved',
  COMPONENT_UPDATED = 'componentUpdated',
  REGISTRY_CLEARED = 'registryCleared'
}

// Event listener type
export type EventListener = (data?: any, ...args: any[]) => void;

/**
 * Registry for tracking components and their state
 */
export class ComponentRegistry {
  private components: Map<string, Component> = new Map();
  private eventListeners: Map<string, Set<EventListener>> = new Map();
  private lifecycles: Map<string, ComponentLifecycle> = new Map();

  /**
   * Add a component to the registry
   * 
   * @param component The component to add
   */
  public add(component: Component): void {
    this.components.set(component.id, component);
    this.emit(RegistryEventType.COMPONENT_ADDED, component);
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
    const component = this.components.get(id);
    if (!component) return;

    // Trigger unmount lifecycle hook if registered
    this.triggerLifecycle('unmount', id);
    
    this.components.delete(id);
    this.emit(RegistryEventType.COMPONENT_REMOVED, id);
  }

  /**
   * Update a component in the registry
   * 
   * @param component The updated component
   */
  public update(component: Component): void {
    const existing = this.components.get(component.id);
    if (!existing) {
      this.add(component);
      return;
    }

    // Store the updated component
    this.components.set(component.id, component);
    
    // Trigger update lifecycle hook if registered
    this.triggerLifecycle('update', component.id, component);
    
    this.emit(RegistryEventType.COMPONENT_UPDATED, component, existing);
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
    // Trigger unmount for all components with lifecycle hooks
    this.getLifecycleComponents().forEach(id => {
      this.triggerLifecycle('unmount', id);
    });

    this.components.clear();
    this.lifecycles.clear();
    this.emit(RegistryEventType.REGISTRY_CLEARED);
  }

  /**
   * Register lifecycle hooks for a component
   * 
   * @param id Component ID
   * @param hooks Lifecycle hooks object
   */
  public registerLifecycle(id: string, hooks: {
    onMount?: OnMountHook;
    onUpdate?: OnUpdateHook;
    onUnmount?: OnUnmountHook;
    events?: Record<string, EventHandler>;
  }): void {
    const lifecycle: ComponentLifecycle = {
      id,
      ...hooks,
      isMounted: false
    };
    
    this.lifecycles.set(id, lifecycle);
  }

  /**
   * Trigger a lifecycle hook for a component
   * 
   * @param hookType Type of hook to trigger ('mount', 'update', 'unmount')
   * @param id Component ID
   * @param args Additional arguments to pass to the hook
   */
  public triggerLifecycle(hookType: 'mount' | 'update' | 'unmount', id: string, ...args: any[]): void {
    const lifecycle = this.lifecycles.get(id);
    if (!lifecycle) return;
    
    try {
      switch (hookType) {
        case 'mount':
          if (lifecycle.onMount && !lifecycle.isMounted) {
            lifecycle.onMount();
            lifecycle.isMounted = true;
          }
          break;
          
        case 'update':
          if (lifecycle.onUpdate && lifecycle.isMounted && args.length >= 1) {
            const newVNode = args[0];
            lifecycle.onUpdate(newVNode, lifecycle.lastVNode);
            lifecycle.lastVNode = newVNode;
          }
          break;
          
        case 'unmount':
          if (lifecycle.onUnmount && lifecycle.isMounted) {
            lifecycle.onUnmount();
            lifecycle.isMounted = false;
            // Remove from registry after unmount
            this.lifecycles.delete(id);
          }
          break;
      }
    } catch (error) {
      console.error(`Error in ${hookType} hook for component ${id}:`, error);
    }
  }

  /**
   * Trigger an event for a component
   * 
   * @param componentId Component ID
   * @param eventName Event name
   * @param eventData Event data
   */
  public triggerEvent(componentId: string, eventName: string, eventData: any): void {
    const lifecycle = this.lifecycles.get(componentId);
    if (!lifecycle || !lifecycle.events) return;
    
    const handler = lifecycle.events[eventName];
    if (!handler) return;
    
    try {
      handler(eventData);
    } catch (error) {
      console.error(`Error in event handler ${eventName} for component ${componentId}:`, error);
    }
  }

  /**
   * Get all registered lifecycle components
   * 
   * @returns Array of component IDs with lifecycle hooks
   */
  public getLifecycleComponents(): string[] {
    return Array.from(this.lifecycles.keys());
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
