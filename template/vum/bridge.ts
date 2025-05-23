/**
 * Vum Bridge - Helper functions for calling Lua components
 * 
 * This module provides utilities for calling Lua-backed UI components
 * and converting their output to the format expected by the renderer.
 */

import { bridgeCore, MessageType } from '../../src/bridge/core';
import { EventEmitter } from 'events';

// Cache for rendered components to avoid blocking renders
const renderCache: Map<string, RenderOutput> = new Map();

// Event emitter for render updates
const renderEmitter = new EventEmitter();

/**
 * Highlight specification for a region of text
 */
export interface HighlightSpec {
  group: string;       // Highlight group name
  line: number;        // Line number (0-based)
  col_start: number;   // Start column (0-based)
  col_end: number;     // End column (-1 for end of line)
}

/**
 * Standardized render output for all Vum components
 */
export interface RenderOutput {
  lines: string[];
  highlights?: HighlightSpec[];
}

/**
 * Generate a cache key for a component render
 */
function getCacheKey(module: string, props: any, method: string): string {
  const propsString = JSON.stringify(props);
  return `${module}.${method}:${propsString}`;
}

/**
 * Synchronously get render output, using cache if available
 * 
 * @param module The Lua module path (e.g., 'vue-ui.components.select')
 * @param props The props to pass to the Lua function
 * @param method The method to call (default: 'render')
 * @param fallback Fallback render output if no cache is available
 * @returns Render output (from cache or fallback)
 */
export function getRenderedOutput(
  module: string, 
  props: any,
  method: string = 'render',
  fallback: RenderOutput = { lines: [] }
): RenderOutput {
  const cacheKey = getCacheKey(module, props, method);
  
  // Check if we have a cached result
  if (renderCache.has(cacheKey)) {
    return renderCache.get(cacheKey)!;
  }
  
  // No cache, trigger an async render and return fallback for now
  fetchLuaRender(module, props, method, cacheKey);
  return fallback;
}

/**
 * Asynchronously fetch render output from Lua and update cache
 */
async function fetchLuaRender(
  module: string, 
  props: any,
  method: string,
  cacheKey: string
): Promise<void> {
  try {
    // Call the Lua module via bridge
    const result = await bridgeCore.sendMessage({
      id: props.id || 'vum-global',
      type: MessageType.REQUEST,
      action: 'call',
      payload: {
        module,
        method,
        args: props
      }
    });
    
    if (!result) {
      console.error(`[Vum] Failed to call Lua module ${module}.${method}`);
      return;
    }
    
    // Extract lines and highlights
    let output: RenderOutput;
    
    if (typeof result === 'object' && result.lines) {
      output = {
        lines: Array.isArray(result.lines) ? result.lines : [],
        highlights: result.highlights
      };
    } else if (Array.isArray(result)) {
      // If the result is directly an array of strings
      output = { lines: result as string[] };
    } else {
      // Fallback for unexpected results
      console.warn(`[Vum] Unexpected result from ${module}.${method}:`, result);
      output = { lines: [] };
      return; // Don't update cache with bad data
    }
    
    // Update cache
    renderCache.set(cacheKey, output);
    
    // Emit update event
    renderEmitter.emit('update', cacheKey, output);
  } catch (error) {
    console.error(`[Vum] Error calling Lua module ${module}.${method}:`, error);
  }
}

/**
 * Subscribe to render updates for a component
 */
export function onRenderUpdate(
  module: string,
  props: any,
  method: string,
  callback: (output: RenderOutput) => void
): () => void {
  const cacheKey = getCacheKey(module, props, method);
  
  const listener = (key: string, output: RenderOutput) => {
    if (key === cacheKey) {
      callback(output);
    }
  };
  
  renderEmitter.on('update', listener);
  
  // Return unsubscribe function
  return () => renderEmitter.off('update', listener);
}

/**
 * Check if a Lua module exists and can be loaded
 * 
 * @param module The Lua module path
 * @returns Promise resolving to true if the module exists
 */
export async function luaModuleExists(module: string): Promise<boolean> {
  try {
    const result = await bridgeCore.sendMessage({
      id: 'vum-global',
      type: MessageType.REQUEST,
      action: 'check_module',
      payload: { module }
    });
    
    return !!result && result.success === true;
  } catch (error) {
    return false;
  }
}

/**
 * Clear the render cache for a specific component or all components
 */
export function clearRenderCache(module?: string, props?: any, method: string = 'render'): void {
  if (module && props) {
    const cacheKey = getCacheKey(module, props, method);
    renderCache.delete(cacheKey);
  } else {
    renderCache.clear();
  }
}
