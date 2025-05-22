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
 * Type definition for component props
 */
export interface Props {
  [key: string]: any;
  children?: VNode | VNode[];
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
 * The JSX factory function used to create virtual nodes
 * This will be used by the TypeScript compiler to transform JSX syntax
 */
export function createElement(
  type: string | ComponentFunction,
  props: Props | null,
  ...children: any[]
): VNode {
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
  return {
    type,
    props: props || {},
    children: processedChildren
  };
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
}
