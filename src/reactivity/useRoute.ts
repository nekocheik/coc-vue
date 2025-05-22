import { ExtensionContext, Disposable, events } from 'coc.nvim';
import { BufferRouter, BufferRoute } from '../bufferRouter';

/**
 * Event emitted when the route changes
 */
export const ROUTE_CHANGE_EVENT = 'vue.route.change';

/**
 * RouteWatcher options
 */
export interface RouteWatcherOptions {
  /** Initial route to use */
  initialRoute?: BufferRoute | null;
  /** Auto-refresh interval in milliseconds (0 to disable) */
  refreshInterval?: number;
  /** Whether to watch for buffer changes */
  watchBufferChanges?: boolean;
  /** Whether to use the new fully reactive buffer router */
  useReactiveRouter?: boolean;
}

export function useRoute(context: ExtensionContext, options: RouteWatcherOptions = {}) {
  // Create a buffer router instance
  const bufferRouter = new BufferRouter(context);
  const disposables: Disposable[] = [];

  // Extract options with defaults
  const {
    initialRoute = null,
    refreshInterval = 1000, // Default refresh interval: 1 second
    watchBufferChanges = true, // Default: watch for buffer changes
    useReactiveRouter = true // Default: use the reactive router
  } = options;

  // Internal state
  let currentRoute: BufferRoute | null = initialRoute;
  let isWatching = false;
  let refreshIntervalId: NodeJS.Timeout | null = null;
  let eventListeners: Disposable[] = [];

  // Utility function to check if two routes are equal
  const routesEqual = (a: BufferRoute | null, b: BufferRoute | null): boolean => {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    if (!a || !b) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    // Safe access to properties
    const aId = a.id || '';
    const bId = b.id || '';
    return aId === bId;
  };

  /**
   * Update the current route and notify watchers
   * @param newRoute New route to set
   * @private
   */
  const updateRoute = (newRoute: BufferRoute | null) => {
    if (!routesEqual(currentRoute, newRoute)) {
      const oldRoute = currentRoute;
      currentRoute = newRoute;

      // Notify any listeners - in a production system you might use a more
      // robust event system or reactive primitives here
      console.log(`[useRoute] Route changed: ${oldRoute?.id || 'null'} -> ${newRoute?.id || 'null'}`);
    }
  };

  /**
   * Fetch the current buffer from the router and update the route
   * @private
   */
  const refreshRoute = async () => {
    try {
      const buffer = await bufferRouter.getCurrentBuffer();
      updateRoute(buffer);
    } catch (error) {
      console.error('Error refreshing route:', error);
    }
  };

  /**
   * Start watching for buffer changes
   * @private
   */
  const startWatching = () => {
    if (isWatching) return;

    // Initial refresh
    refreshRoute();

    // Set up interval for legacy mode
    if (!useReactiveRouter && refreshInterval > 0) {
      refreshIntervalId = setInterval(refreshRoute, refreshInterval);
    }

    // Set up buffer change watching
    if (watchBufferChanges) {
      if (useReactiveRouter) {
        // Use the reactive buffer router events
        const bufferChangedListener = bufferRouter.on(
          BufferRouter.Events.CURRENT_BUFFER_CHANGED,
          (data: { oldBuffer: BufferRoute | null, newBuffer: BufferRoute | null }) => {
            updateRoute(data.newBuffer);
          }
        );

        eventListeners.push(bufferChangedListener);
      } else {
        // Legacy mode - use coc.nvim events directly
        const bufferChangedDisposable = events.on(
          'BufEnter',
          refreshRoute,
          null,
          context.subscriptions
        );

        eventListeners.push(bufferChangedDisposable);
      }
    }

    isWatching = true;
  };

  /**
   * Stop watching for buffer changes
   * @private
   */
  const stopWatching = () => {
    if (!isWatching) return;

    // Clear interval if it exists
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    }

    // Clean up event listeners
    for (const listener of eventListeners) {
      listener.dispose();
    }
    eventListeners = [];

    isWatching = false;
  };

  /**
   * Switch to a different buffer
   * @param identifier Buffer ID or path
   * @returns Success status
   */
  const switchRoute = async (identifier: string): Promise<boolean> => {
    try {
      // This will automatically trigger route update through the event system
      const success = await bufferRouter.switchBuffer(identifier);
      return success;
    } catch (error) {
      console.error('Error switching route:', error);
      return false;
    }
  };

  /**
   * Dispose of all resources
   */
  const dispose = () => {
    stopWatching();
    bufferRouter.dispose();

    for (const disposable of disposables) {
      disposable.dispose();
    }
  };

  // Start watching for changes immediately
  startWatching();
  
  return {
    /**
     * Current route information
     */
    get route(): BufferRoute | null {
      return currentRoute;
    },

    /**
     * Current route path
     */
    get path(): string | null {
      return currentRoute?.path || null;
    },

    /**
     * Current route ID
     */
    get id(): string | null {
      return currentRoute?.id || null;
    },

    /**
     * Current route query parameters
     */
    get query(): Record<string, any> | null {
      return currentRoute?.query || null;
    },

    /**
     * Watch for route changes
     * @param callback Function to call when the route changes
     * @returns Disposable to stop watching
     */
    watchRoute: (callback: (route: BufferRoute | null) => void) => {
      // Create a wrapper function that calls the callback
      const callbackWrapper = () => callback(currentRoute);
      
      // Create a custom disposable for this watcher
      const watcherDisposable: Disposable = {
        dispose: () => {
          // This will be called when the watcher is disposed
          const index = eventListeners.indexOf(watcherDisposable);
          if (index !== -1) {
            eventListeners.splice(index, 1);
          }
        }
      };
      
      // Add to our list of listeners
      eventListeners.push(watcherDisposable);
      
      // Initial callback with current route
      callbackWrapper();
      
      // Register with the buffer router for changes
      const routeChangedListener = bufferRouter.on(
        BufferRouter.Events.CURRENT_BUFFER_CHANGED,
        () => callbackWrapper()
      );
      
      // Ensure this listener gets cleaned up when the watcher is disposed
      const originalDispose = watcherDisposable.dispose;
      watcherDisposable.dispose = () => {
        routeChangedListener.dispose();
        originalDispose.call(watcherDisposable);
      };
      
      return watcherDisposable;
    },

    switchRoute,

    /**
     * Create a new route
     * @param path Route path
     * @param query Route query parameters
     * @returns Route ID
     */
    createRoute: async (
      path: string,
      query?: Record<string, any>
    ): Promise<string | null> => {
      try {
        // This will automatically trigger route update through the event system
        const bufferId = await bufferRouter.createBuffer(path, query);
        return bufferId;
      } catch (error) {
        console.error('Error creating route:', error);
        return null;
      }
    },

    /**
     * Delete a buffer by ID
     * @param id Buffer ID to delete
     * @returns Success status
     */
    deleteRoute: async (id: string): Promise<boolean> => {
      try {
        // This will automatically trigger route update through the event system
        const success = await bufferRouter.deleteBuffer(id);
        return success;
      } catch (error) {
        console.error('Error deleting route:', error);
        return false;
      }
    },

    dispose
  };
}
