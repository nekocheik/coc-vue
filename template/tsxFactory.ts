/**
 * Custom TSX Factory for Coc-vue
 * 
 * NO REACT. Project-native TSX factory only.
 * 
 * This module provides the necessary functions for JSX/TSX to compile
 * without any React dependencies. It translates JSX into native Coc-vue
 * structures that can be rendered to Neovim buffers.
 * 
 * @module template/tsxFactory
 */

/**
 * Event handler type
 */
export type EventHandler = (event: any) => void;

/**
 * Type definition for component props
 */
export interface Props {
  [key: string]: any;
  children?: VNode | VNode[];
  events?: Record<string, EventHandler>;
}

/**
 * VNode type that represents a virtual DOM element
 */
export interface VNode {
  type: string | ComponentFunction;
  props: Props;
  children: VNode[];
}

/**
 * Component function type
 */
export type ComponentFunction = (props: Props) => VNode;

/**
 * Intrinsic element map for the custom JSX factory
 */
export interface IntrinsicElements {
  [elementName: string]: any;
}

/**
 * Creates an emit function for event handlers
 * @returns Function to emit events to Lua
 */
// Define custom types for event bridge
interface EventBridge {
  emit: (eventName: string, payload?: any) => void;
}

interface CustomWindow extends Window {
  eventBridge?: EventBridge;
}

// Custom global interface for Node.js environment
interface CustomGlobal {
  eventBridge?: EventBridge;
}

export function createEmit() {
  return function emit(eventName: string, payload?: any) {
    try {
      // Check if window.eventBridge exists (for browser-based testing)
      if (typeof window !== 'undefined' && (window as CustomWindow).eventBridge) {
        (window as CustomWindow).eventBridge!.emit(eventName, payload);
      } else if (typeof global !== 'undefined' && (global as unknown as CustomGlobal).eventBridge) {
        // For Node.js environment
        (global as unknown as CustomGlobal).eventBridge!.emit(eventName, payload);
      } else {
        console.warn('Event bridge not available, event not emitted:', eventName);
      }
    } catch (e) {
      console.error('Error emitting event:', e);
    }
  };
}

/**
 * Extract Vue-style event attributes from props
 * 
 * @param props Component props
 * @returns Props with events extracted
 */
function extractEventHandlers(props: Props): Props {
  if (!props) return {};
  
  const result: Props = { ...props };
  const events: Record<string, EventHandler> = {};
  let hasEvents = false;
  
  // Look for Vue-style event attributes (@click, @on:save, etc.)
  Object.keys(props).forEach(key => {
    if (key.startsWith('@')) {
      // Extract event name (remove @ prefix)
      const eventName = key.substring(1);
      const handler = props[key];
      
      if (typeof handler === 'function') {
        // Store the event handler
        events[eventName] = handler;
        hasEvents = true;
        
        // Remove from props
        delete result[key];
      }
    }
  });
  
  // Add events object if any events were found
  if (hasEvents) {
    result.events = events;
  }
  
  return result;
}

/**
 * Extract lifecycle hooks from props
 * 
 * @param props Component props
 * @returns Props with lifecycle hooks extracted
 */
function extractLifecycleHooks(props: Props): Props {
  if (!props) return {};
  
  const result: Props = { ...props };
  const hooks: Record<string, any> = {};
  
  // Check for lifecycle hooks
  ['onMount', 'onUpdate', 'onUnmount'].forEach(hookName => {
    if (typeof props[hookName] === 'function') {
      hooks[hookName] = props[hookName];
      // Keep hooks in props for now, they'll be used by the registry
    }
  });
  
  return result;
}

/**
 * The JSX factory function used to create virtual nodes
 * This will be used by the TypeScript compiler to transform JSX syntax
 */
export function createElement(
  type: string | ComponentFunction,
  props: Props | null,
  ...children: any[]
): VNode {
  // Process props
  const processedProps = props ? extractEventHandlers(extractLifecycleHooks(props)) : {};
  
  // Add emit function to props for event handlers
  if (processedProps.events) {
    const emit = createEmit();
    
    // Wrap each event handler to provide emit function
    Object.keys(processedProps.events).forEach(eventName => {
      const originalHandler = processedProps.events![eventName];
      
      processedProps.events![eventName] = (event: any) => {
        // Add emit function to event object
        if (event && typeof event === 'object') {
          event.emit = emit;
        }
        
        // Call original handler
        return originalHandler(event);
      };
    });
  }
  
  // Process and flatten children
  const processedChildren = children
    .flat()
    .filter(child => child != null)
    .map(child => {
      // If child is a primitive value (string, number, etc.), create a text node
      if (typeof child !== 'object') {
        return {
          type: 'TEXT_NODE',
          props: { nodeValue: String(child) },
          children: []
        };
      }
      return child;
    });
  
  // Create the virtual node
  const vnode = {
    type,
    props: processedProps,
    children: processedChildren
  };
  
  // Register the node with the registry if it has lifecycle hooks
  if (processedProps.onMount || processedProps.onUpdate || processedProps.onUnmount) {
    // Use a unique ID for this node
    const nodeId = typeof type === 'string' ? type : type.name;
    const uniqueId = `${nodeId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    processedProps._nodeId = uniqueId;
    
    // Register with componentRegistry
    try {
      // Dynamically import to avoid circular dependencies
      const { componentRegistry } = require('./registry');
      
      // Register lifecycle hooks but don't trigger mount yet
      // Mount will be triggered by the renderer
      componentRegistry.registerLifecycle(uniqueId, {
        onMount: processedProps.onMount,
        onUpdate: processedProps.onUpdate,
        onUnmount: processedProps.onUnmount,
        events: processedProps.events
      });
    } catch (e) {
      console.error('Error registering component lifecycle hooks:', e);
    }
  }
  
  return vnode;
}

/**
 * Helper to create fragment elements (when returning multiple elements)
 */
export function Fragment(props: Props): VNode {
  return {
    type: 'FRAGMENT',
    props,
    children: props.children ? (Array.isArray(props.children) ? props.children : [props.children]) : []
  };
}

/**
 * Registry of mounted components
 */
export const MountRegistry = {
  slots: new Map<string, VNode>(),
  bars: new Map<string, VNode>(),
  
  // Register a slot with a component
  registerSlot(name: string, node: VNode): void {
    this.slots.set(name, node);
  },
  
  // Register a bar with content
  registerBar(position: string, node: VNode): void {
    this.bars.set(position, node);
  },
  
  // Get a mounted slot
  getSlot(name: string): VNode | undefined {
    return this.slots.get(name);
  },
  
  // Get a mounted bar
  getBar(position: string): VNode | undefined {
    return this.bars.get(position);
  },
  
  // Reset the registry
  reset(): void {
    this.slots.clear();
    this.bars.clear();
  }
};

/**
 * Namespace JSX to provide our custom definitions
 */
export namespace JSX {
  export interface Element extends VNode {}
  export interface IntrinsicElements {
    [elemName: string]: any;
  }
  
  // Add support for Vue-style event attributes
  export interface ElementAttributesProperty {
    props: {}; // Specify the property used for props
  }
  
  // Support for TypeScript checking of Vue-style events
  export interface IntrinsicAttributes {
    // Lifecycle hooks
    onMount?: () => void;
    onUpdate?: (newVNode: VNode, oldVNode: VNode) => void;
    onUnmount?: () => void;
    
    // Allow any Vue-style event with index signature
    [key: string]: any;
  }
}
