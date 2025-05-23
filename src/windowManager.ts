import { Disposable, workspace } from 'coc.nvim';
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
   * Set content for a bar (top or bottom)
   * @param position The position of the bar ('top' or 'bottom')
   * @param content Array of content strings to display in the bar
   * @returns True if content was set, false otherwise
   */
  public setBarContent(position: 'top' | 'bottom', content: string[]): boolean {
    try {
      console.log(`[WindowManager] Setting ${position} bar content:`, content);

      // Get the bar slot name
      const barSlot = `bar-${position}` as WindowSlot;

      // Check if there's a buffer mounted in this bar slot
      const barMount = this.slots[barSlot];
      if (!barMount || !barMount.bufferId) {
        console.warn(`[WindowManager] No buffer mounted in ${barSlot}, cannot set content`);
        return false;
      }

      // Use a background process to update the buffer content when possible
      setTimeout(async () => {
        try {
          const nvim = workspace.nvim;
          const bufferId = parseInt(barMount.bufferId, 10);

          // Check if buffer is still valid
          const isValid = await nvim.call('nvim_buf_is_valid', [bufferId]);
          if (!isValid) {
            console.warn(`[WindowManager] Buffer ${bufferId} is no longer valid when setting bar content`);
            return;
          }

          // Make buffer modifiable
          await nvim.call('nvim_buf_set_option', [bufferId, 'modifiable', true]);

          // Set buffer content
          await nvim.call('nvim_buf_set_lines', [bufferId, 0, -1, false, content]);

          // Make buffer unmodifiable again
          await nvim.call('nvim_buf_set_option', [bufferId, 'modifiable', false]);
          await nvim.call('nvim_buf_set_option', [bufferId, 'modified', false]);

          console.log(`[WindowManager] Successfully set ${position} bar content`);
        } catch (error) {
          console.error(`[WindowManager] Error setting ${position} bar content:`, error);
        }
      }, 10);

      return true;
    } catch (error) {
      console.error(`[WindowManager] Error in setBarContent for ${position}:`, error);
      return false;
    }
  }

  /**
   * Refresh a specific buffer content
   * @param bufferId The ID of the buffer to refresh
   * @returns Promise that resolves to true if refresh was successful
   */
  public async refreshBuffer(bufferId: string): Promise<boolean> {
    try {
      console.log(`[WindowManager] Refreshing buffer: ${bufferId}`);
      const nvim = workspace.nvim;

      // Verify buffer exists and is valid
      const isValid = await nvim.call('nvim_buf_is_valid', [parseInt(bufferId, 10)]);
      if (!isValid) {
        console.warn(`[WindowManager] Buffer ${bufferId} is not valid, cannot refresh`);
        return false;
      }

      // Find which slot this buffer is mounted in
      let targetSlot: WindowSlot | null = null;
      let component = '';

      for (const [slot, mount] of Object.entries(this.slots)) {
        if (mount && mount.bufferId === bufferId) {
          targetSlot = slot as WindowSlot;
          component = mount.component;
          break;
        }
      }

      if (!targetSlot) {
        console.warn(`[WindowManager] Buffer ${bufferId} is not mounted in any slot`);
        return false;
      }

      // Get the buffer's path and query if available
      const bufferInfo = await this.bufferRouter.getBufferInfo(bufferId);
      if (!bufferInfo) {
        console.warn(`[WindowManager] No info available for buffer ${bufferId}`);
        return false;
      }

      // For most reliable refresh, create a new buffer and swap it
      const newBufferId = await this.bufferRouter.createBuffer(
        bufferInfo.path,
        bufferInfo.query || {}
      );

      if (!newBufferId) {
        console.error(`[WindowManager] Failed to create new buffer for refresh`);
        return false;
      }

      // Mount the new buffer in the same slot
      const size = this.slots[targetSlot]?.size;
      await this.mountBuffer(targetSlot, newBufferId, component, size);

      // Close the old buffer
      try {
        // Allow some time for the swap to complete
        setTimeout(async () => {
          try {
            // Delete the old buffer if it's still valid
            const stillValid = await nvim.call('nvim_buf_is_valid', [parseInt(bufferId, 10)]);
            if (stillValid) {
              await this.bufferRouter.deleteBuffer(bufferId);
            }
          } catch (deleteError) {
            console.warn(`[WindowManager] Error during cleanup of old buffer:`, deleteError);
          }
        }, 100);
      } catch (closeError) {
        // Non-critical error, just log it
        console.warn(`[WindowManager] Error closing old buffer:`, closeError);
      }

      return true;
    } catch (error) {
      console.error(`[WindowManager] Error refreshing buffer ${bufferId}:`, error);
      return false;
    }
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
   * Create a fallback buffer with default content
   * @param slotName The name of the slot
   * @returns Promise resolving to buffer ID (as string) or null if creation failed
   * @private
   */
  private async createFallbackBuffer(slotName: string): Promise<string | null> {
    try {
      const nvim = workspace.nvim;

      // Create a new buffer (listed=false, scratch=true)
      const bufferId = await nvim.call('nvim_create_buf', [false, true]);

      // Generate default content based on slot
      const content = [
        `===== COC-VUE FALLBACK BUFFER =====`,
        `Slot: ${slotName}`,
        `Created: ${new Date().toISOString()}`,
        ``,
        `This is a fallback buffer created automatically by the template system.`,
        `The original buffer was invalid or unavailable.`,
        ``,
        `===== END OF FALLBACK BUFFER =====`
      ];

      // Set buffer content
      await nvim.call('nvim_buf_set_lines', [bufferId, 0, -1, false, content]);

      // Set buffer name
      await nvim.call('nvim_buf_set_name', [bufferId, `coc-vue://fallback/${slotName}`]);

      // Set buffer options
      await nvim.call('nvim_buf_set_option', [bufferId, 'modifiable', false]);
      await nvim.call('nvim_buf_set_option', [bufferId, 'buftype', 'nofile']);

      console.log(`[WindowManager] Created fallback buffer ${bufferId} for slot ${slotName}`);
      return bufferId.toString();
    } catch (error) {
      console.error(`[WindowManager] Error creating fallback buffer for ${slotName}:`, error);
      return null;
    }
  }

  /**
   * Validate buffer and replace with fallback if invalid
   * @param bufferId The buffer ID to validate
   * @param slotName The name of the slot this buffer belongs to
   * @returns Promise resolving to a valid buffer ID or null if not possible
   * @private
   */
  private async validateBuffer(bufferId: string, slotName: string): Promise<string | null> {
    try {
      const nvim = workspace.nvim;
      let bufId: number;

      // Handle both numeric and string buffer IDs
      if (!isNaN(parseInt(bufferId, 10))) {
        // If it's a numeric ID (from nvim.createBuffer), parse it
        bufId = parseInt(bufferId, 10);
      } else {
        // If it's a string ID (custom from BufferRouter), try to look it up
        try {
          // Try to resolve the buffer ID using the BufferRouter
          const bufferInfo = await this.bufferRouter.getBufferInfo(bufferId);
          if (bufferInfo && bufferInfo.nvimBufferId) {
            bufId = bufferInfo.nvimBufferId;
          } else {
            // If we can't resolve it, create a fallback
            console.warn(`[WindowManager] Could not resolve buffer info for ${bufferId}`);
            return await this.createFallbackBuffer(slotName);
          }
        } catch (e) {
          // If lookup fails, fall back to parsing as a number as a last resort
          console.warn(`[WindowManager] Error looking up buffer ${bufferId}:`, e);
          bufId = parseInt(bufferId, 10);
        }
      }

      // Check if buffer is valid
      const isValid = !isNaN(bufId) && await nvim.call('nvim_buf_is_valid', [bufId]);

      if (isValid) {
        // Get buffer name for logging
        let bufferName = '<unknown>';
        try {
          bufferName = await nvim.call('nvim_buf_get_name', [bufId]);
        } catch (e) {
          // Ignore errors when getting buffer name
        }

        console.log(`[WindowManager] Buffer ${bufferId} (${bufferName}) for slot ${slotName} is VALID`);
        return bufferId;
      } else {
        console.warn(`[WindowManager] Buffer ${bufferId} for slot ${slotName} is INVALID, creating fallback`);

        // Create a fallback buffer
        const fallbackId = await this.createFallbackBuffer(slotName);
        if (fallbackId) {
          // Update the slot mount with the new buffer ID
          if (this.slots[slotName as WindowSlot]) {
            this.slots[slotName as WindowSlot]!.bufferId = fallbackId;
          }
          return fallbackId;
        }
      }

      return null;
    } catch (error) {
      console.error(`[WindowManager] Error validating buffer ${bufferId} for slot ${slotName}:`, error);
      return null;
    }
  }

  /**
   * Get the current state of all template buffers
   * @returns Record mapping slots to buffer details
   */
  public async getBufferState(): Promise<Record<string, { bufferId: string, valid: boolean, name: string }>> {
    const state: Record<string, { bufferId: string, valid: boolean, name: string }> = {};
    const nvim = workspace.nvim;

    for (const [slot, mount] of Object.entries(this.slots)) {
      if (mount && mount.bufferId) {
        try {
          const bufId = parseInt(mount.bufferId, 10);
          const valid = await nvim.call('nvim_buf_is_valid', [bufId]);
          let name = '<unknown>';

          try {
            if (valid) {
              name = await nvim.call('nvim_buf_get_name', [bufId]);
            }
          } catch (e) {
            // Ignore errors getting buffer name
          }

          state[slot] = {
            bufferId: mount.bufferId,
            valid,
            name
          };
        } catch (e) {
          state[slot] = {
            bufferId: mount.bufferId,
            valid: false,
            name: '<error checking>'
          };
        }
      } else {
        state[slot] = {
          bufferId: 'none',
          valid: false,
          name: '<not mounted>'
        };
      }
    }

    return state;
  }

  /**
   * Create the actual visual layout using the configured slots
   * This calls the Lua window manager to create the layout based on current slots
   * @returns Promise that resolves to true if layout was created successfully
   */
  public async createLayout(): Promise<boolean> {
    try {
      console.log('[WindowManager] Creating visual layout from slots');
      const nvim = workspace.nvim;

      // Create a buffer map from the current slots
      const bufferMap: Record<string, string> = {};

      // Required slots for a complete layout
      const requiredSlots = ['slot-left', 'slot-center-top', 'slot-center-bottom', 'slot-right'];
      let missingSlots: string[] = [];

      // Convert slots to a format the Lua code can understand
      for (const [slot, mount] of Object.entries(this.slots)) {
        if (mount && mount.bufferId) {
          bufferMap[slot] = mount.bufferId;
        } else if (requiredSlots.includes(slot)) {
          missingSlots.push(slot);
        }
      }

      // Check if any required slots are missing
      if (missingSlots.length > 0) {
        console.warn(`[WindowManager] Missing buffers for required slots: ${missingSlots.join(', ')}`);
      }

      // Skip if no buffers are mounted
      if (Object.keys(bufferMap).length === 0) {
        console.warn('[WindowManager] No buffers mounted, skipping layout creation');
        return false;
      }

      // Log the initial slot-to-buffer mapping for debugging
      console.log('[DEBUG] Initial buffer mapping:', bufferMap);

      // Prepare the validated buffer mapping
      const validatedBufferMap: Record<string, string> = {};

      // Validate each buffer before creating the layout
      for (const [slot, bufferId] of Object.entries(bufferMap)) {
        try {
          // Tenter de récupérer les informations du buffer pour obtenir nvimBufferId
          const bufferInfo = await this.bufferRouter.getBufferInfo(bufferId);

          if (bufferInfo && bufferInfo.nvimBufferId) {
            // Utiliser directement nvimBufferId
            validatedBufferMap[slot] = bufferInfo.nvimBufferId.toString();
            console.log(`[WindowManager] Using nvimBufferId ${bufferInfo.nvimBufferId} for slot ${slot}`);
          } else {
            // Fallback à la validation traditionnelle
            const validBufferId = await this.validateBuffer(bufferId, slot);
            if (validBufferId) {
              validatedBufferMap[slot] = validBufferId;
            } else {
              console.error(`[WindowManager] Could not validate buffer ${bufferId} for slot ${slot}`);
            }
          }
        } catch (e) {
          console.error(`[WindowManager] Error validating buffer for ${slot}:`, e);
          // Fallback à la validation traditionnelle
          const validBufferId = await this.validateBuffer(bufferId, slot);
          if (validBufferId) {
            validatedBufferMap[slot] = validBufferId;
          }
        }
      }

      // Check if we have at least one valid buffer
      if (Object.keys(validatedBufferMap).length === 0) {
        console.error('[WindowManager] No valid buffers after validation, aborting layout creation');
        return false;
      }

      // Log the validated slot-to-buffer mapping
      console.log('[DEBUG] Validated buffer mapping:', validatedBufferMap);

      // Convert the validated buffer map to Lua format with corrected slot names
      // Remove the 'slot-' prefix from slot names when sending to Lua
      const luaBufferMap = Object.entries(validatedBufferMap)
        .map(([slot, bufferId]) => {
          // Extract the correct slot name by removing the 'slot-' prefix if present
          const luaSlotName = slot.replace(/^slot-/, '');
          return `['${luaSlotName}'] = ${bufferId}`;
        })
        .join(', ');
        
      console.log('[DEBUG] Mapped Lua buffer mapping:', luaBufferMap);

      // Call the Lua function to create the layout with validated buffers
      await nvim.command(
        `lua 
        local buffers = {${luaBufferMap}}
        -- Add validation in Lua
        local valid_buffers = {}
        for slot, buf_id in pairs(buffers) do
          if vim.api.nvim_buf_is_valid(tonumber(buf_id)) then
            valid_buffers[slot] = tonumber(buf_id)
            print(string.format("[window_manager] Buffer %d for slot %s is valid", buf_id, slot))
          else
            print(string.format("[window_manager] ERROR: Buffer %d for slot %s is invalid in Lua layer", buf_id, slot))
          end
        end
        
        if next(valid_buffers) == nil then
          print("[window_manager] ERROR: No valid buffers available for layout creation")
          return false
        end
        
        require('vue-ui.utils.window_manager').create_layout(valid_buffers)
        `
      );

      // Setup bar content if bars are present (with validation)
      // Get the bar buffers with the prefix that our code uses
      const barTop = validatedBufferMap['bar-top'];
      const barBottom = validatedBufferMap['bar-bottom'];
      
      console.log('[WindowManager] Bar buffers:', { barTop, barBottom });

      if (barTop && barBottom) {
        console.log('[WindowManager] Setting up both bars');
        await nvim.command(`
          lua
          local top_valid = vim.api.nvim_buf_is_valid(tonumber(${barTop}))
          local bottom_valid = vim.api.nvim_buf_is_valid(tonumber(${barBottom}))
          
          if top_valid and bottom_valid then
            require('vue-ui.utils.window_manager').setup_bar_content(tonumber(${barTop}), tonumber(${barBottom}))
          elseif top_valid then
            require('vue-ui.utils.window_manager').setup_bar_content(tonumber(${barTop}), nil)
          elseif bottom_valid then
            require('vue-ui.utils.window_manager').setup_bar_content(nil, tonumber(${barBottom}))
          end
        `);
      } else if (barTop) {
        console.log('[WindowManager] Setting up top bar only');
        await nvim.command(`
          lua
          if vim.api.nvim_buf_is_valid(tonumber(${barTop})) then
            require('vue-ui.utils.window_manager').setup_bar_content(tonumber(${barTop}), nil)
          end
        `);
      } else if (barBottom) {
        console.log('[WindowManager] Setting up bottom bar only');
        await nvim.command(`
          lua
          if vim.api.nvim_buf_is_valid(tonumber(${barBottom})) then
            require('vue-ui.utils.window_manager').setup_bar_content(nil, tonumber(${barBottom}))
          end
        `);
      }

      console.log('[WindowManager] Layout created successfully with validated buffers');
      return true;
    } catch (error) {
      console.error('[WindowManager] Error creating layout:', error);
      return false;
    }
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
   * Dispose of all resources used by the WindowManager
   * This is called when the extension is deactivated
   */
  /**
   * Gets the buffer ID for a specific slot
   * @param slotName Name of the slot to get buffer for
   * @returns Buffer ID or null if no buffer is mounted
   */
  public getSlotBuffer(slotName: WindowSlot): string | null {
    const slotMount = this.slots[slotName];
    return slotMount ? slotMount.bufferId : null;
  }

  /**
   * Disposes resources used by the WindowManager
   */
  public dispose(): void {
    console.log('[WindowManager] Disposing resources');
    
    // Clean up all disposables
    this.disposables.forEach(disposable => {
      try {
        disposable.dispose();
      } catch (e) {
        console.error('[WindowManager] Error disposing resource:', e);
      }
    });
    
    // Reset all slots
    for (const slotName in this.slots) {
      this.slots[slotName as WindowSlot] = null;
    }
  }
}
