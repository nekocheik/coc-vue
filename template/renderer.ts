/**
 * Renderer module for VNode to buffer content conversion
 * 
 * This module is responsible for converting virtual DOM nodes (VNodes)
 * into buffer content (string arrays) and applying them to Neovim buffers
 * with minimal updates.
 */

// Import types only, no direct dependency on BufferRouter implementation
import type { BufferUpdate } from '../src/bufferRouter';
import { VNode as TSXVNode } from './tsxFactory';

// For dependency injection and testing
let bufferRouterInstance: {
  updateBufferContent: (bufferId: number, lines: BufferUpdate) => Promise<boolean>
} | null = null;

/**
 * Set the buffer router instance
 * This allows for dependency injection and testing
 */
export function setBufferRouter(instance: any): void {
  bufferRouterInstance = instance;
}

/**
 * VNode types representing a Virtual DOM for rendering
 */
export interface TextVNode {
  type: 'TEXT_NODE';
  content: string;
}

export interface ElementVNode {
  type: string;
  props: Record<string, any>;
  children: VNode[];
}

export type VNode = TextVNode | ElementVNode;

/**
 * Convert a TSX factory VNode to a renderer-compatible VNode
 */
export function convertToRendererVNode(tsxNode: TSXVNode): VNode {
  // For text nodes (special handling)
  if (typeof tsxNode === 'string') {
    return {
      type: 'TEXT_NODE',
      content: tsxNode
    };
  }
  
  // Check if it's a component function
  if (typeof tsxNode.type === 'function') {
    // Execute the component function to get its result
    const result = tsxNode.type(tsxNode.props || {});
    return convertToRendererVNode(result);
  }
  
  // Regular element node
  return {
    type: tsxNode.type as string,
    props: tsxNode.props || {},
    children: (tsxNode.children || []).map(convertToRendererVNode)
  };
}

/**
 * Cached buffer lines for computing diffs
 */
const bufferCache: Record<number, string[]> = {};

/**
 * Render a VNode tree to an array of strings (buffer lines)
 * Accepts both renderer VNodes and TSX factory VNodes
 */
export function renderVNode(vnode: VNode | TSXVNode): string[] {
  // Special case for Vum components created by factory
  if (typeof vnode === 'object' && vnode !== null && 'type' in vnode) {
    // Check if this is a Vum component (has the marker)
    if ((vnode.type as any)?.__isVum) {
      try {
        // Instantiate the component
        const Comp = vnode.type as any;
        // Safely access props and children, handling different VNode types
        const props = 'props' in vnode ? vnode.props : {};
        const children = 'children' in vnode ? vnode.children : [];
        const inst = new Comp(props, children);
        
        // Get the render output
        const output = inst.render();
        
        // Return the rendered lines
        if (output && Array.isArray(output.lines)) {
          return output.lines;
        } else if (output && Array.isArray(output)) {
          return output;
        }
        
        // Fallback if render method returned unexpected format
        return ['[Vum Component Render Error]'];
      } catch (err: any) {
        console.error('Error rendering Vum component:', err);
        return [`[Vum Render Error: ${err?.message || 'Unknown error'}]`];
      }
    }
  }
  
  // Convert TSX VNode if necessary
  const rendererNode = 'content' in vnode || typeof vnode.type === 'string' 
    ? vnode as VNode 
    : convertToRendererVNode(vnode as TSXVNode);
  
  // Handle text nodes
  if (rendererNode.type === 'TEXT_NODE') {
    return [(rendererNode as TextVNode).content];
  }
  
  // Handle element nodes
  const { type, props, children } = rendererNode as ElementVNode;
  
  // Process children
  let childLines: string[] = [];
  if (children && children.length) {
    // Flatten all child lines
    childLines = children.reduce((acc, child) => {
      return [...acc, ...renderVNode(child)];
    }, [] as string[]);
  }
  
  // Apply element-specific formatting
  switch (type) {
    case 'Text':
      // Apply text formatting based on props
      if (props.bold) {
        return childLines.map(line => `**${line}**`);
      }
      return childLines;
      
    case 'Container':
      // Container just returns its children's lines
      return childLines;
      
    default:
      // For unknown elements, just return children
      return childLines;
  }
}

/**
 * Apply buffer content updates with minimal diffing
 * 
 * Returns an array where:
 * - undefined = keep existing line (no change)
 * - null = delete line
 * - string = insert/replace line with this content
 * 
 * @param oldLines Previous buffer content
 * @param newLines New buffer content
 * @returns Array of operations
 */
export function computeDiff(oldLines: string[], newLines: string[]): (string | null | undefined)[] {
  const diff: (string | null | undefined)[] = [];
  const maxLines = Math.max(oldLines.length, newLines.length);
  
  // Compare line by line
  for (let i = 0; i < maxLines; i++) {
    if (i >= newLines.length) {
      // Line was removed
      diff[i] = null; // null marks a line for deletion
    } else if (i >= oldLines.length || newLines[i] !== oldLines[i]) {
      // Line was added or changed
      diff[i] = newLines[i];
    } else {
      // Line unchanged
      diff[i] = undefined; // undefined means "keep existing line"
    }
  }
  
  return diff;
}

/**
 * Apply buffer content updates with minimal diffing
 * 
 * @param bufferId Buffer ID
 * @param newLines New content lines
 */
export function applyDiff(bufferId: number, newLines: string[]): void {
  // Get the current buffer content from cache
  const currentLines = bufferCache[bufferId] || [];
  
  // Compute the minimal diff
  const diff = computeDiff(currentLines, newLines);
  
  // Check if there are any changes
  const hasChanges = diff.some(line => line !== undefined);
  
  // Only update if there are changes
  if (hasChanges && bufferRouterInstance) {
    // Update the buffer
    bufferRouterInstance.updateBufferContent(bufferId, diff);
    
    // Update the cache
    bufferCache[bufferId] = [...newLines];
    
    // Trigger lifecycle hooks for components if needed
    // This will be implemented when integrating with the registry
  }
}
