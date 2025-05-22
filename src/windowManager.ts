import { Disposable } from 'coc.nvim';
import { BufferRouter, BufferRoute } from './bufferRouter';
import { reactive } from './reactivity';

/**
 * Type for the window slots available in the window manager
 */
export type WindowSlot = 
  | 'slot-left'
  | 'slot-center-top'
  | 'slot-center-bottom'
  | 'slot-right'
  | 'bar-top'
  | 'bar-bottom';

/**
 * Type for the buffer and component mount information
 */
export interface WindowBufferMount {
  bufferId: string;
  component: string;
  size?: number;
  route?: BufferRoute | null;
}

/**
 * Class to manage window layout with multiple slots for components/buffers
 * Provides a reactive interface to mount, unmount and resize components in slots
 * Each slot can have a single buffer/component mounted at a time
 * Integrates with BufferRouter to provide route information to components
 */
export class WindowManager implements Disposable {
  private bufferRouter: BufferRouter;
  private slots: Record<WindowSlot, WindowBufferMount | null>;
  private disposables: Disposable[] = [];

  /**
   * Creates a new WindowManager instance
   * @param bufferRouter Buffer router instance to use for buffer management
   */
  constructor(bufferRouter: BufferRouter) {
    this.bufferRouter = bufferRouter;
    
    // Initialize all slots with null (no buffer mounted)
    this.slots = reactive({
      'slot-left': null,
      'slot-center-top': null,
      'slot-center-bottom': null,
      'slot-right': null,
      'bar-top': null,
      'bar-bottom': null
    });

    // Listen for buffer changes to update routes
    this.disposables.push(
      this.bufferRouter.on(BufferRouter.Events.BUFFER_DELETED, ({ id }) => {
        // Unmount from any slot where this buffer is mounted
        Object.entries(this.slots).forEach(([slot, mount]) => {
          if (mount && mount.bufferId === id) {
            this.unmountBuffer(slot as WindowSlot);
          }
        });
      }),

      this.bufferRouter.on(BufferRouter.Events.CURRENT_BUFFER_CHANGED, async () => {
        // Update routes for all mounted buffers
        await this.updateAllRoutes();
      })
    );
  }

  /**
   * Mount a buffer into a slot with the specified component
   * @param slot The slot to mount the buffer in
   * @param bufferId The ID of the buffer to mount
   * @param component The component to use for rendering
   * @param size Optional size for the slot
   * @returns True if mounted successfully, false otherwise
   */
  public async mountBuffer(slot: WindowSlot, bufferId: string, component: string, size?: number): Promise<boolean> {
    if (!bufferId || !component) {
      return false;
    }

    // Create the mount object
    const mount: WindowBufferMount = {
      bufferId,
      component,
      size,
      route: null
    };

    // Try to get current buffer information to find a match
    try {
      const current = await this.bufferRouter.getCurrentBuffer();
      if (current && current.id === bufferId) {
        mount.route = current;
      }
    } catch (error) {
      console.error(`Error getting buffer route for ${bufferId}:`, error);
      // Continue even if we can't get the route - it might be updated later
    }

    // Update the slot
    this.slots[slot] = mount;
    return true;
  }

  /**
   * Unmount a buffer from a slot
   * @param slot The slot to unmount
   * @returns True if unmounted successfully, false if the slot was already empty
   */
  public unmountBuffer(slot: WindowSlot): boolean {
    if (!this.slots[slot]) {
      return false;
    }

    this.slots[slot] = null;
    return true;
  }

  /**
   * Get the buffer mount information for a slot
   * @param slot The slot to get information for
   * @returns The buffer mount information, or null if no buffer is mounted
   */
  public getSlot(slot: WindowSlot): WindowBufferMount | null {
    return this.slots[slot];
  }

  /**
   * Get the route information for a component
   * @param component The component name to get route information for
   * @returns The route information, or null if not found
   */
  public getRouteForComponent(component: string): BufferRoute | null {
    // Find all slots where this component is mounted
    for (const [_, mount] of Object.entries(this.slots)) {
      if (mount && mount.component === component) {
        return mount.route || null;
      }
    }
    
    return null;
  }

  /**
   * Resize a slot to the specified size
   * @param slot The slot to resize
   * @param size The new size for the slot
   * @returns True if resized successfully, false if the slot is empty or a bar
   */
  public resizeSlot(slot: WindowSlot, size: number): boolean {
    // Bars cannot be resized
    if (slot === 'bar-top' || slot === 'bar-bottom') {
      return false;
    }

    const mount = this.slots[slot];
    if (!mount) {
      return false;
    }

    mount.size = size;
    return true;
  }

  /**
   * Check if a slot has a mounted buffer
   * @param slot The slot to check
   * @returns True if the slot has a mounted buffer, false otherwise
   */
  public hasMount(slot: WindowSlot): boolean {
    return this.slots[slot] !== null;
  }

  /**
   * Update route information for all mounted buffers
   * @private
   */
  private async updateAllRoutes(): Promise<void> {
    // Get the current buffer to check for matches
    const currentBuffer = await this.bufferRouter.getCurrentBuffer();
    
    for (const mount of Object.values(this.slots)) {
      if (mount && mount.bufferId) {
        try {
          // If this mount matches the current buffer, update it
          if (currentBuffer && currentBuffer.id === mount.bufferId) {
            mount.route = currentBuffer;
          }
        } catch (error) {
          console.error(`Error updating route for ${mount.bufferId}:`, error);
        }
      }
    }
  }

  /**
   * Get reactive access to the slots object
   * @returns The reactive slots object
   */
  public getReactiveSlots(): Record<WindowSlot, WindowBufferMount | null> {
    return this.slots;
  }

  /**
   * Clean existing layout by closing all windows and unmounting all buffers
   * This is used before rendering a new template to ensure a clean slate
   * @returns Promise that resolves when the layout is cleaned
   */
  public async cleanLayout(): Promise<boolean> {
    try {
      console.log('[WindowManager] Cleaning existing layout');
      
      // Unmount all buffers from slots
      Object.keys(this.slots).forEach(slot => {
        this.unmountBuffer(slot as WindowSlot);
      });
      
      // Additional cleanup logic can be added here as needed
      // For example, closing windows or resetting other state
      
      return true;
    } catch (error) {
      console.error('[WindowManager] Error cleaning layout:', error);
      return false;
    }
  }

  /**
   * Clean up all resources used by the window manager
   */
  public dispose(): void {
    // Dispose all disposables
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];

    // Clear all slots
    Object.keys(this.slots).forEach(slot => {
      this.slots[slot as WindowSlot] = null;
    });
  }
}
