/**
 * Vum Component Factory
 * 
 * This module provides a factory function for creating Lua-backed Vum components
 * with minimal boilerplate. It handles the common patterns for:
 * - Mounting/unmounting
 * - Event handling
 * - Lua bridge interaction
 * - Rendering with fallbacks
 */

import { VumComponent } from './Vum';
import { eventBridge } from './events';

/**
 * Defines a type for rendered output from components
 */
export interface RenderOutput {
  lines: string[];
}

/**
 * Simple function to subscribe to render updates from Lua
 * @param moduleId The Lua module ID to subscribe to
 * @param props Properties to pass to the Lua module
 * @param callback Callback to execute when updates are received
 */
function onRenderUpdate(moduleId: string, props: any, callback: () => void): () => void {
  // In a real implementation, this would subscribe to Lua updates
  // and call the callback when the component needs to re-render
  setTimeout(callback, 0); // Trigger the initial render
  return () => {}; // Return cleanup function
}

/**
 * Configuration for creating a Lua-backed component
 */
export type BridgeConfig<P, L> = {
  componentName: string;
  luaModule: string | ((props: P) => string);
  mapProps: (p: P) => L;
  onMount?: (instance: VumComponent<P>) => void;
  onUnmount?: (instance: VumComponent<P>) => void;
  fallback: (p: P) => string[];
  events?: { [luaEvt: string]: (inst: VumComponent<P>, payload: any) => void };
}

/**
 * Factory returning a ready-to-use Vum component class.
 */
export function createLuaComponent<P, L>(cfg: BridgeConfig<P, L>) {
  const { componentName, luaModule } = cfg;
  
  // Create the component class
  class LuaBackedComponent extends VumComponent<P> {
    public _unsubscribeRender?: () => void;
    public _lastProps?: L;
    
    // Mark this class as a Vum component for the renderer
    static __isVum = true;

    constructor(props: P) {
      super(props);
      this.onMount();
    }

    public onMount(): void {
      const luaProps = cfg.mapProps(this.props);
      this._lastProps = luaProps;
      
      const moduleStr = typeof luaModule === 'function' 
        ? luaModule(this.props) 
        : luaModule;
      
      // Notify Lua that this component is mounted
      eventBridge.sendToLua('mount', this.id, {
        component_type: moduleStr.split('.').pop(),
        module: moduleStr,
        ...luaProps
      });
      
      // Register event handlers
      if (cfg.events) {
        Object.keys(cfg.events).forEach(k =>
          eventBridge.on(`${k}:${this.id}`,
            (payload: any) => cfg.events![k](this, payload))
        );
      }
      
      // Subscribe to render updates
      this._unsubscribeRender = onRenderUpdate(
        moduleStr, 
        { id: this.id, ...luaProps }, 
        () => this.setState(() => ({})) // Trigger re-render
      );
      
      // Call custom onMount handler if provided
      cfg.onMount?.(this);
    }

    public onUnmount(): void {
      // Cleanup render subscription if it exists
      if (this._unsubscribeRender) {
        this._unsubscribeRender();
        this._unsubscribeRender = undefined;
      }
      
      // Unregister event handlers
      if (cfg.events) {
        Object.keys(cfg.events).forEach(k =>
          eventBridge.off(`${k}:${this.id}`));
      }
      
      // Send unmount event to Lua side
      const moduleStr = typeof cfg.luaModule === 'function' ? cfg.luaModule(this.props) : cfg.luaModule;
      eventBridge.sendToLua('unmount', this.id, { module: moduleStr });
      
      // Call custom onUnmount handler if provided
      cfg.onUnmount?.(this);
    }

    public render(): RenderOutput {
      // Get Lua props for rendering
      const luaProps = { id: this.id, ...cfg.mapProps(this.props) };
      const moduleStr = typeof cfg.luaModule === 'function' ? cfg.luaModule(this.props) : cfg.luaModule;
      
      // In a real implementation, this would call to Lua for rendering
      // For now, we just return the fallback content
      return { lines: cfg.fallback(this.props) };
    }
  }
  
  // Add marker for renderer detection
  (LuaBackedComponent as any).__isVum = true;
  
  return LuaBackedComponent;
}
