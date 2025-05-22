/**
 * Renderer module for VNode to buffer content conversion
 * 
 * This module is responsible for converting virtual DOM nodes (VNodes)
 * into buffer content (string arrays) and applying them to Neovim buffers
 * with minimal updates.
 */

// Import types only, no direct dependency on BufferRouter implementation
import type { BufferRouter } from '../src/bufferRouter';
import { VNode as TSXVNode } from './tsxFactory';

// For dependency injection and testing
let bufferRouterInstance: {
  updateBufferContent: (bufferId: number, lines: (string | undefined)[]) => Promise<boolean>
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
 */
export function applyDiff(bufferId: number, newLines: string[]): void {
  // Get the current buffer content from cache
  const currentLines = bufferCache[bufferId] || [];
  
  // Compute the minimal diff
  const diff: (string | undefined)[] = [];
  const maxLines = Math.max(currentLines.length, newLines.length);
  
  let hasChanges = false;
  
  // Compare line by line
  for (let i = 0; i < maxLines; i++) {
    if (i >= newLines.length) {
      // Line was removed
      diff[i] = ''; // Empty string marks a line for deletion
      hasChanges = true;
    } else if (i >= currentLines.length || newLines[i] !== currentLines[i]) {
      // Line was added or changed
      diff[i] = newLines[i];
      hasChanges = true;
    } else {
      // Line unchanged
      diff[i] = undefined; // undefined means "keep existing line"
    }
  }
  
  // Only update if there are changes
  if (hasChanges && bufferRouterInstance) {
    // Update the buffer
    bufferRouterInstance.updateBufferContent(bufferId, diff);
    
    // Update the cache
    bufferCache[bufferId] = [...newLines];
  }
}
