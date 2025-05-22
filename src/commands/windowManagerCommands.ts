import { commands, window, workspace, ExtensionContext } from 'coc.nvim';
import { BufferRouter } from '../bufferRouter';
import { WindowManager, WindowSlot } from '../windowManager';

/**
 * Register window manager commands for the Coc-vue plugin
 * This demonstrates real-world integration of the window manager with the plugin
 */
export function registerWindowManagerCommands(context: ExtensionContext) {
  // Create instances of BufferRouter and WindowManager to use in commands
  const bufferRouter = new BufferRouter(context);
  const windowManager = new WindowManager(bufferRouter);
  
  // Register command to show a demo layout with all slots populated
  context.subscriptions.push(
    commands.registerCommand('windowManager.demoLayout', async () => {
      try {
        window.showInformationMessage('Setting up WindowManager demo layout...');
        
        // Step 1: Create test buffers for each slot with unique IDs and queries
        window.showInformationMessage('Creating test buffers with unique queries...');
        
        const buffers = {
          left: await createDemoBuffer(bufferRouter, 'left-panel.vue', { test: 'left', panel: 'navigation' }),
          centerTop: await createDemoBuffer(bufferRouter, 'center-top.vue', { test: 'center-top', panel: 'editor' }),
          centerBottom: await createDemoBuffer(bufferRouter, 'center-bottom.vue', { test: 'center-bottom', panel: 'console' }),
          right: await createDemoBuffer(bufferRouter, 'right-panel.vue', { test: 'right', panel: 'properties' })
        };
        
        // Check if all buffers were created successfully
        if (!buffers.left || !buffers.centerTop || !buffers.centerBottom || !buffers.right) {
          window.showErrorMessage('Failed to create some demo buffers');
          return false;
        }
        
        // Step 2: Mount buffers into their respective slots
        window.showInformationMessage('Mounting buffers into slots...');
        
        const mountResults = {
          left: await windowManager.mountBuffer('slot-left', buffers.left, 'vim-component', 30),
          centerTop: await windowManager.mountBuffer('slot-center-top', buffers.centerTop, 'vim-component', 50),
          centerBottom: await windowManager.mountBuffer('slot-center-bottom', buffers.centerBottom, 'vim-component', 20),
          right: await windowManager.mountBuffer('slot-right', buffers.right, 'vim-component', 30)
        };
        
        // Step 3: Set static content for bar slots
        window.showInformationMessage('Setting up bar content...');
        
        await windowManager.mountBuffer('bar-top', buffers.left, 'tab-bar-component');
        await windowManager.mountBuffer('bar-bottom', buffers.left, 'status-bar-component');
        
        // Step 4: Display information about the layout
        await displayLayoutInfo(windowManager);
        
        // Step 5: Set up display of route info in each buffer
        await setupRouteInfoDisplay(bufferRouter, buffers);
        
        window.showInformationMessage('WindowManager demo layout is ready!');
        return true;
      } catch (error) {
        window.showErrorMessage(`Error setting up demo layout: ${error}`);
        return false;
      }
    })
  );
  
  // Add the window manager to subscriptions for disposal
  context.subscriptions.push(windowManager);
  
  return {
    windowManager
  };
}

/**
 * Create a demo buffer with the specified path and query
 * @param bufferRouter The buffer router to use
 * @param path The path for the buffer
 * @param query The query parameters
 * @returns The buffer ID, or null if creation failed
 */
async function createDemoBuffer(
  bufferRouter: BufferRouter,
  path: string,
  query: Record<string, any>
): Promise<string | null> {
  try {
    const bufferId = await bufferRouter.createBuffer(path, query);
    if (!bufferId) {
      window.showErrorMessage(`Failed to create buffer for ${path}`);
      return null;
    }
    return bufferId;
  } catch (error) {
    window.showErrorMessage(`Error creating demo buffer: ${error}`);
    return null;
  }
}

/**
 * Display information about the current layout
 * @param windowManager The window manager instance
 */
async function displayLayoutInfo(windowManager: WindowManager): Promise<void> {
  const slots = ['slot-left', 'slot-center-top', 'slot-center-bottom', 'slot-right', 'bar-top', 'bar-bottom'];
  const info: string[] = ['WindowManager Demo Layout:'];
  
  for (const slotName of slots) {
    const slot = windowManager.getSlot(slotName as WindowSlot);
    if (slot) {
      info.push(`${slotName}: Buffer ${slot.bufferId} | Component: ${slot.component} | Size: ${slot.size || 'default'}`);
      
      if (slot.route) {
        info.push(`  - Route: ID=${slot.route.id}, Path=${slot.route.path}`);
        info.push(`  - Query: ${JSON.stringify(slot.route.query)}`);
      } else {
        info.push(`  - No route information available`);
      }
    } else {
      info.push(`${slotName}: Empty`);
    }
  }
  
  // Display the layout information in the message area
  for (const line of info) {
    await workspace.nvim.command(`echo "${line.replace(/"/g, '\\"')}"`);
  }
}

/**
 * Set up the display of route information in each buffer
 * @param bufferRouter The buffer router
 * @param buffers The buffer IDs
 */
async function setupRouteInfoDisplay(
  bufferRouter: BufferRouter,
  buffers: Record<string, string | null>
): Promise<void> {
  const nvim = workspace.nvim;
  
  // For each buffer, set up a visible display of its route information
  for (const [location, bufferId] of Object.entries(buffers)) {
    if (!bufferId) continue;
    
    try {
      // Switch to the buffer
      await bufferRouter.switchBuffer(bufferId);
      
      // Get current buffer number
      const bufnr = await nvim.call('bufnr', ['%']);
      
      // Clear the buffer content
      await nvim.call('deletebufline', [bufnr, 1, '$']);
      
      // Add route information to the buffer
      const lines = [
        `======== ${location.toUpperCase()} PANEL ========`,
        '',
        `Buffer ID: ${bufferId}`,
        `Query: test='${location}', panel='${location === 'centerTop' ? 'editor' : 
                                        location === 'centerBottom' ? 'console' : 
                                        location === 'right' ? 'properties' : 'navigation'}'`,
        '',
        'This is a demo buffer created by the WindowManager',
        'to showcase the window layout capabilities.',
        '',
        '=================================='
      ];
      
      // Add the lines to the buffer
      await nvim.call('appendbufline', [bufnr, 0, lines]);
      
      // Set buffer local options to make it look nice
      await nvim.command(`call setbufvar(${bufnr}, '&modifiable', 0)`);
      await nvim.command(`call setbufvar(${bufnr}, '&modified', 0)`);
    } catch (error) {
      window.showErrorMessage(`Error setting up route display for ${location}: ${error}`);
    }
  }
}
