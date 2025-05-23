/**
 * Vum Runtime - Lightweight component system for Neovim UI
 * 
 * This runtime provides a component-based abstraction that works with the existing
 * template system while adding lifecycle hooks and Lua-backed rendering capabilities.
 */

import { reactive, watch } from '../../src/reactivity';
import { componentRegistry as registry } from '../registry';
import { EventEmitter } from 'events';
import { RenderOutput, HighlightSpec } from './bridge';

// Event emitter for rerender requests
export const emitter = new EventEmitter();

/**
 * Marker interface for Vum components so the renderer can identify them
 */
export interface VumComponentMarker {
  __isVum: true;
}

/**
 * Base class for all Vum components
 * Provides lifecycle hooks and state management
 */
export abstract class VumComponent<P = any, S = any> implements VumComponentMarker {
  readonly props: Readonly<P>;
  public state: S;
  public _isMounted: boolean = false;
  public _id: string;
  public _luaModule?: string;
  
  // Marker property for the renderer to identify Vum components
  readonly __isVum: true = true;

  constructor(props: P, id?: string, luaModule?: string) {
    this.props = props;
    this._id = id || `vum-component-${Math.random().toString(36).substring(2, 9)}`;
    this._luaModule = luaModule;
    this.state = this.initState(props);
    
    // Register in Vum registry for hot-reloading support
    vumRegistry.register(this);
    
    this.onMount();
    this._isMounted = true;
  }

  /** 
   * Initialize component state
   * Override this method to provide custom initial state
   */
  public initState(props: P): S | any { 
    return {}; 
  }

  /** Lifecycle hook: Called when component is mounted */
  public onMount(): void {}

  /** Lifecycle hook: Called when component is updated */
  public onUpdate(): void {}

  /** Lifecycle hook: Called when component is unmounted */
  public onUnmount(): void {}

  /** 
   * Render component to buffer-ready output
   * Must be implemented by all Vum components
   */
  abstract render(): RenderOutput;

  /**
   * Update component state and trigger rerender
   * @param mutator Function that modifies the state
   */
  public setState(mutator: (state: S) => void): void {
    mutator(this.state);
    this.onUpdate();
    requestRerender();
  }

  /**
   * Get component ID
   */
  public get id(): string {
    return this._id;
  }
  
  /**
   * Get Lua module name if this component is Lua-backed
   */
  public get luaModule(): string | undefined {
    return this._luaModule;
  }

  /**
   * Clean up component
   */
  public dispose(): void {
    if (this._isMounted) {
      this.onUnmount();
      this._isMounted = false;
      vumRegistry.unregister(this.id);
    }
  }
}

/**
 * Request a rerender of the UI
 * This will trigger an event that the templateIntegration can listen to
 */
export function requestRerender(): void {
  emitter.emit('rerender');
}

/**
 * Registry of active Vum components
 */
export class VumRegistry {
  private static _instance: VumRegistry;
  private _components: Map<string, VumComponent> = new Map();
  
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): VumRegistry {
    if (!VumRegistry._instance) {
      VumRegistry._instance = new VumRegistry();
    }
    return VumRegistry._instance;
  }
  
  /**
   * Register a component
   * @param component The component to register
   */
  public register(component: VumComponent): void {
    this._components.set(component.id, component);
  }
  
  /**
   * Unregister a component
   * @param id The ID of the component to unregister
   */
  public unregister(id: string): void {
    const component = this._components.get(id);
    if (component) {
      this._components.delete(id);
    }
  }
  
  /**
   * Get a component by ID
   * @param id The ID of the component
   */
  public get(id: string): VumComponent | undefined {
    return this._components.get(id);
  }
  
  /**
   * Get all registered components
   */
  public getAll(): VumComponent[] {
    return Array.from(this._components.values());
  }
  
  /**
   * Clean up all components
   */
  public clear(): void {
    this._components.forEach(component => component.dispose());
    this._components.clear();
  }
  
  /**
   * Trigger a render update for all components
   * Useful for hot-reloading
   */
  public updateAll(): void {
    requestRerender();
  }
}

// Export singleton instance
export const vumRegistry = VumRegistry.getInstance();
