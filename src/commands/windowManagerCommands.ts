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
        // Log for debugging
        console.log('[WindowManager] Starting demo layout setup');
        window.showInformationMessage('Setting up WindowManager demo layout...');
        
        // Step 1: Create test buffers for each slot with unique IDs and queries
        window.showInformationMessage('Creating test buffers with unique queries...');
        
        const buffers = {
          left: await createDemoBuffer('left-panel.vue', { test: 'left', panel: 'navigation' }),
          centerTop: await createDemoBuffer('center-top.vue', { test: 'center-top', panel: 'editor' }),
          centerBottom: await createDemoBuffer('center-bottom.vue', { test: 'center-bottom', panel: 'console' }),
          right: await createDemoBuffer('right-panel.vue', { test: 'right', panel: 'properties' })
        };
        
        // Check if all buffers were created successfully
        if (!buffers.left || !buffers.centerTop || !buffers.centerBottom || !buffers.right) {
          window.showErrorMessage('Failed to create some demo buffers');
          return false;
        }
        
        // Step 2: Mount buffers into their respective slots
        window.showInformationMessage('Mounting buffers into slots...');
        
        // Mount each buffer into its respective slot and log any failures
        const leftMounted = await windowManager.mountBuffer('slot-left', buffers.left, 'vim-component', 30);
        const centerTopMounted = await windowManager.mountBuffer('slot-center-top', buffers.centerTop, 'vim-component', 50);
        const centerBottomMounted = await windowManager.mountBuffer('slot-center-bottom', buffers.centerBottom, 'vim-component', 20);
        const rightMounted = await windowManager.mountBuffer('slot-right', buffers.right, 'vim-component', 30);
        
        if (!leftMounted || !centerTopMounted || !centerBottomMounted || !rightMounted) {
          window.showWarningMessage('Some slots could not be mounted properly');
        }
        
        // Step 3: Create special buffers for bar slots
        window.showInformationMessage('Setting up bar content...');
        
        // Create the bar buffers
        const barTopBuffer = await createBarBuffer('tab-bar');
        const barBottomBuffer = await createBarBuffer('status-bar');
        
        if (!barTopBuffer || !barBottomBuffer) {
          window.showErrorMessage('Failed to create bar buffers');
          return false;
        }
        
        // Mount the bar buffers
        await windowManager.mountBuffer('bar-top', barTopBuffer, 'tab-bar-component');
        await windowManager.mountBuffer('bar-bottom', barBottomBuffer, 'status-bar-component');
        
        // Step 4: Display information about the layout
        await displayLayoutInfo(windowManager);
        
        // Step 5: Set up display of route info in each buffer
        await setupRouteInfoDisplay(buffers);
        
        // Step 6: Create the actual visual layout using the Lua window manager
        window.showInformationMessage('Creating visual window layout...');
        await createVisualLayout(buffers, barTopBuffer, barBottomBuffer);
        
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
 * Create a demo buffer with the specified path and query directly in Neovim
 * @param path The path for the buffer
 * @param query The query parameters
 * @returns The buffer ID, or null if creation failed
 */
async function createDemoBuffer(
  path: string,
  query: Record<string, any>
): Promise<string | null> {
  try {
    const nvim = workspace.nvim;
    
    // First create a real Neovim buffer
    const bufferId = await nvim.call('nvim_create_buf', [false, true]);
    if (!bufferId) {
      window.showErrorMessage(`Failed to create Neovim buffer for ${path}`);
      return null;
    }
    
    // Convert bufferId to string
    const bufferIdStr = String(bufferId);
    
    // Log buffer creation
    console.log(`Created Neovim buffer with ID ${bufferIdStr} for ${path}`);
    
    // Fill the buffer with initial content to show path and query
    const lines = [
      `======== ${path.toUpperCase()} ========`,
      '',
      `Path: ${path}`,
      `Query: ${JSON.stringify(query)}`,
      '',
      `Buffer ID: ${bufferIdStr}`,
      '',
      'This is a demo buffer created for the WindowManager',
      'to showcase the window layout capabilities.',
      '',
      '==================================',
    ];
    
    // Set buffer lines
    await nvim.call('nvim_buf_set_lines', [bufferId, 0, -1, false, lines]);
    
    // Set buffer name/path for better identification
    await nvim.command(`call nvim_buf_set_name(${bufferId}, '${path.replace(/'/g, "''")}?${encodeURIComponent(JSON.stringify(query))}')`);
    
    // Validate that the buffer is valid
    const isValid = await nvim.call('nvim_buf_is_valid', [bufferId]);
    if (!isValid) {
      window.showErrorMessage(`Buffer ${bufferIdStr} is not valid after creation`);
      return null;
    }
    
    return bufferIdStr;
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
 * Create a special buffer for bar areas with appropriate content
 * @param type The type of bar (tab-bar or status-bar)
 * @returns The buffer ID, or null if creation failed
 */
async function createBarBuffer(
  type: string
): Promise<string | null> {
  try {
    const nvim = workspace.nvim;
    
    // Create a new buffer
    const bufferId = await nvim.call('nvim_create_buf', [false, true]);
    if (!bufferId) {
      window.showErrorMessage(`Failed to create ${type} buffer`);
      return null;
    }
    
    // Convert to string
    const bufferIdStr = String(bufferId);
    
    // Set buffer name for better identification
    await nvim.command(`call nvim_buf_set_name(${bufferId}, '${type}-demo')`);
    
    // Add content based on bar type
    const lines = type === 'tab-bar' ? [
      '====== COC-VUE TABS DEMO ' + '='.repeat(50),
      '[Home] [Components] [Settings] [Help]' + ' '.repeat(30) + 'WindowManager Demo'
    ] : [
      'Status: Ready' + ' '.repeat(20) + 'Layout: Default' + ' '.repeat(20) + 'Mode: Normal',
      '====== COC-VUE STATUS DEMO ' + '='.repeat(50)
    ];
    
    // Set buffer lines
    await nvim.call('nvim_buf_set_lines', [bufferId, 0, -1, false, lines]);
    
    // Validate buffer
    const isValid = await nvim.call('nvim_buf_is_valid', [bufferId]);
    if (!isValid) {
      window.showErrorMessage(`Buffer ${bufferIdStr} for ${type} is not valid after creation`);
      return null;
    }
    
    // Log buffer creation
    console.log(`Created ${type} buffer with ID ${bufferIdStr}`);
    
    return bufferIdStr;
  } catch (error) {
    window.showErrorMessage(`Error creating ${type} buffer: ${error}`);
    return null;
  }
}

/**
 * Create the actual visual layout using the Lua window manager
 * @param buffers The main buffer IDs
 * @param barTopBuffer The top bar buffer ID
 * @param barBottomBuffer The bottom bar buffer ID
 */
async function createVisualLayout(
  buffers: Record<string, string | null>,
  barTopBuffer: string,
  barBottomBuffer: string
): Promise<boolean> {
  try {
    const nvim = workspace.nvim;
    
    // Debug: Log all buffer IDs before creating layout
    console.log('Creating layout with buffer IDs:', {
      'slot-left': buffers.left,
      'slot-center-top': buffers.centerTop,
      'slot-center-bottom': buffers.centerBottom,
      'slot-right': buffers.right,
      'bar-top': barTopBuffer,
      'bar-bottom': barBottomBuffer
    });
    
    // For each buffer, validate it exists in Neovim
    for (const [slot, bufferId] of Object.entries({
      'slot-left': buffers.left,
      'slot-center-top': buffers.centerTop,
      'slot-center-bottom': buffers.centerBottom,
      'slot-right': buffers.right,
      'bar-top': barTopBuffer,
      'bar-bottom': barBottomBuffer
    })) {
      if (bufferId) {
        const isValid = await nvim.call('nvim_buf_is_valid', [parseInt(bufferId, 10)]);
        console.log(`Buffer validation for ${slot}: ID ${bufferId} is ${isValid ? 'valid' : 'INVALID'}`);
        
        if (!isValid) {
          window.showErrorMessage(`Buffer ${bufferId} for ${slot} is not valid before creating layout`);
        }
      }
    }
    
    // Ensure the window_manager module is loaded
    await nvim.command('lua if not package.loaded["vue-ui.utils.window_manager"] then require("vue-ui.utils.window_manager") end');
    
    // Create a mapping of slots to buffer IDs
    const bufferMap = {
      'slot-left': buffers.left,
      'slot-center-top': buffers.centerTop,
      'slot-center-bottom': buffers.centerBottom,
      'slot-right': buffers.right,
      'bar-top': barTopBuffer,
      'bar-bottom': barBottomBuffer
    };
    
    // Convert the buffer map to Lua format, parsing string IDs to integers
    const luaBufferMap = Object.entries(bufferMap)
      .filter(([_, bufferId]) => bufferId !== null) // Skip null buffer IDs
      .map(([slot, bufferId]) => `['${slot}'] = ${bufferId}`)
      .join(', ');
    
    // Call the Lua function to create the layout with error handling
    try {
      await nvim.command(`lua require('vue-ui.utils.window_manager').create_layout({${luaBufferMap}})`);
      console.log('Layout creation successful');
    } catch (error) {
      console.error('Error creating layout:', error);
      window.showErrorMessage(`Layout creation failed: ${error}`);
      return false;
    }
    
    // Set up the bar content with error handling
    try {
      // Debug logging
      console.log(`Setting up bar content with buffer IDs: top=${barTopBuffer}, bottom=${barBottomBuffer}`);
      
      // Ensure both buffers are still valid
      const topValid = await nvim.call('nvim_buf_is_valid', [parseInt(barTopBuffer, 10)]);
      const bottomValid = await nvim.call('nvim_buf_is_valid', [parseInt(barBottomBuffer, 10)]);
      
      console.log(`Bar buffer validation: top=${topValid}, bottom=${bottomValid}`);
      
      if (topValid && bottomValid) {
        await nvim.command(`lua require('vue-ui.utils.window_manager').setup_bar_content(${barTopBuffer}, ${barBottomBuffer})`);
        console.log('Bar content setup successful');
      } else {
        window.showWarningMessage('Some bar buffers are no longer valid, skipping content setup');
      }
    } catch (error) {
      console.error('Error setting up bar content:', error);
      window.showErrorMessage(`Bar content setup failed: ${error}`);
      // Continue anyway, as this is not critical
    }
    
    return true;
  } catch (error) {
    window.showErrorMessage(`Error creating visual layout: ${error}`);
    return false;
  }
}

/**
 * Set up the display of route information in each buffer
 * @param buffers The buffer IDs
 */
async function setupRouteInfoDisplay(
  buffers: Record<string, string | null>
): Promise<void> {
  const nvim = workspace.nvim;
  
  // For each buffer, add additional information about the WindowManager
  for (const [location, bufferId] of Object.entries(buffers)) {
    if (!bufferId) continue;
    
    try {
      // Validate the buffer is still valid
      const isValid = await nvim.call('nvim_buf_is_valid', [parseInt(bufferId, 10)]);
      if (!isValid) {
        window.showErrorMessage(`Buffer ${bufferId} is no longer valid when setting up route display`);
        continue;
      }
      
      // Get current buffer content
      const currentLines = await nvim.call('nvim_buf_get_lines', [parseInt(bufferId, 10), 0, -1, false]);
      
      // Make buffer modifiable
      await nvim.call('nvim_buf_set_option', [parseInt(bufferId, 10), 'modifiable', true]);
      
      // Add WindowManager information at the end
      const additionalInfo = [
        '',
        '--- WindowManager Information ---',
        `Slot: ${location === 'left' ? 'slot-left' : 
                location === 'centerTop' ? 'slot-center-top' : 
                location === 'centerBottom' ? 'slot-center-bottom' : 'slot-right'}`,
        `Component: vim-component`,
        `Created: ${new Date().toISOString()}`,
        ''
      ];
      
      // Set the updated content
      await nvim.call('nvim_buf_set_lines', [
        parseInt(bufferId, 10), 
        currentLines.length, 
        currentLines.length, 
        false, 
        additionalInfo
      ]);
      
      // Set buffer local options to make it look nice
      await nvim.call('nvim_buf_set_option', [parseInt(bufferId, 10), 'modifiable', false]);
      await nvim.call('nvim_buf_set_option', [parseInt(bufferId, 10), 'modified', false]);
      
      console.log(`Added route information to buffer ${bufferId} for ${location}`);
    } catch (error) {
      window.showErrorMessage(`Error setting up route display for ${location}: ${error}`);
    }
  }
}
