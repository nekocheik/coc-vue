/**
 * Hot Reload Support for Template System
 * 
 * Provides functionality to update buffers in real-time when template
 * components are modified. This allows for a live development experience
 * within Neovim.
 * 
 * @module template/hotReload
 */

import { WindowManager } from '../src/windowManager';
import { BufferRouter } from '../src/bufferRouter';
import { MountRegistry, VNode } from './tsxFactory';
import { renderTemplate } from './templateIntegration';

// Map of component paths to buffers
type ComponentBufferMap = Map<string, string[]>;

/**
 * Hot Reload Manager
 * 
 * Manages the hot reload functionality for the template system
 */
export class HotReloadManager {
  private windowManager: WindowManager;
  private bufferRouter: BufferRouter;
  private componentBufferMap: ComponentBufferMap;
  private fileWatchers: Map<string, any>;
  private isWatchingEnabled: boolean;
  
  constructor(windowManager: WindowManager, bufferRouter: BufferRouter) {
    this.windowManager = windowManager;
    this.bufferRouter = bufferRouter;
    this.componentBufferMap = new Map();
    this.fileWatchers = new Map();
    this.isWatchingEnabled = false;
  }
  
  /**
   * Register a component-to-buffer mapping
   * 
   * @param componentPath Path to the component file
   * @param bufferId ID of the buffer containing the rendered component
   */
  public registerComponentBuffer(componentPath: string, bufferId: string): void {
    if (!this.componentBufferMap.has(componentPath)) {
      this.componentBufferMap.set(componentPath, []);
    }
    
    const buffers = this.componentBufferMap.get(componentPath) || [];
    if (!buffers.includes(bufferId)) {
      buffers.push(bufferId);
      this.componentBufferMap.set(componentPath, buffers);
    }
    
    // Start watching the component file if not already watching
    if (this.isWatchingEnabled && !this.fileWatchers.has(componentPath)) {
      this.watchComponentFile(componentPath);
    }
  }
  
  /**
   * Start watching for changes to component files
   */
  public startWatching(): void {
    if (this.isWatchingEnabled) {
      return;
    }
    
    this.isWatchingEnabled = true;
    
    // Start watching all registered component files
    for (const componentPath of this.componentBufferMap.keys()) {
      if (!this.fileWatchers.has(componentPath)) {
        this.watchComponentFile(componentPath);
      }
    }
    
    console.log('[HotReload] Started watching for component changes');
  }
  
  /**
   * Stop watching for changes to component files
   */
  public stopWatching(): void {
    if (!this.isWatchingEnabled) {
      return;
    }
    
    this.isWatchingEnabled = false;
    
    // Stop all file watchers
    for (const [componentPath, watcher] of this.fileWatchers.entries()) {
      if (watcher && typeof watcher.close === 'function') {
        watcher.close();
      }
      this.fileWatchers.delete(componentPath);
    }
    
    console.log('[HotReload] Stopped watching for component changes');
  }
  
  /**
   * Refresh all buffers associated with a component
   * 
   * @param componentPath Path to the component file
   */
  public async refreshComponentBuffers(componentPath: string): Promise<void> {
    const bufferIds = this.componentBufferMap.get(componentPath) || [];
    if (bufferIds.length === 0) {
      return;
    }
    
    console.log(`[HotReload] Refreshing ${bufferIds.length} buffers for component: ${componentPath}`);
    
    for (const bufferId of bufferIds) {
      await this.refreshBuffer(bufferId);
    }
  }
  
  /**
   * Refresh a single buffer with updated content
   * 
   * @param bufferId ID of the buffer to refresh
   */
  private async refreshBuffer(bufferId: string): Promise<void> {
    try {
      // Get buffer information
      const bufferInfo = await this.bufferRouter.getBufferInfo(bufferId);
      if (!bufferInfo) {
        console.warn(`[HotReload] Could not find buffer info for ID: ${bufferId}`);
        return;
      }
      
      // Re-render the buffer with updated component
      const { path, query } = bufferInfo;
      
      // Signal the WindowManager to refresh the buffer
      await this.windowManager.refreshBuffer(bufferId);
      
      console.log(`[HotReload] Refreshed buffer ${bufferId} (${path})`);
    } catch (error) {
      console.error(`[HotReload] Error refreshing buffer ${bufferId}:`, error);
    }
  }
  
  /**
   * Re-render the entire app template
   */
  public async refreshEntireTemplate(): Promise<boolean> {
    try {
      console.log('[HotReload] Re-rendering entire template');
      
      // Dynamically import the App component to get the latest version
      const { default: App } = await import('./index');
      
      // Create the App VNode
      const appNode = App();
      
      // Re-render the template
      return await renderTemplate(appNode, this.windowManager, this.bufferRouter);
    } catch (error) {
      console.error('[HotReload] Error re-rendering template:', error);
      return false;
    }
  }
  
  /**
   * Watch a component file for changes
   * 
   * @param componentPath Path to the component file
   */
  private watchComponentFile(componentPath: string): void {
    // In a real implementation, this would use fs.watch or chokidar
    // For this simulation, we'll just set up the structure
    
    // Simulate a file watcher
    const simulatedWatcher = {
      componentPath,
      close: () => {
        console.log(`[HotReload] Stopped watching: ${componentPath}`);
      }
    };
    
    this.fileWatchers.set(componentPath, simulatedWatcher);
    console.log(`[HotReload] Started watching: ${componentPath}`);
  }
  
  /**
   * Simulate a file change event for testing
   * 
   * @param componentPath Path to the component file
   */
  public async simulateFileChange(componentPath: string): Promise<boolean> {
    if (!this.isWatchingEnabled) {
      console.warn('[HotReload] Watching is disabled, ignoring simulated change');
      return false;
    }
    
    console.log(`[HotReload] Simulated file change: ${componentPath}`);
    await this.refreshComponentBuffers(componentPath);
    return true;
  }
}
