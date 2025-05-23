// COC-VUE Implementation with Vue-like Reactive Bridge
import { workspace, ExtensionContext, commands, window } from 'coc.nvim';
import { BridgeCore, BridgeMessage, MessageType, bridgeCore } from './bridge/core';
import { registerBufferCommands } from './commands/bufferCommands';
import { registerWindowManagerCommands } from './commands/windowManagerCommands';
import { Select } from './components/select';
import { renderAppTemplate } from '../template/templateIntegration';

// Registry to keep track of active components
// Export for testing purposes
export const componentRegistry = new Map<string, any>();

// Main activation function for the extension
export async function activate(context: ExtensionContext): Promise<void> {
  console.log('[COC-VUE] Starting activation of Select component integration');
  
  // Initialize the buffer router and register buffer commands
  // Add null check to prevent errors in tests
  const bufferCommandResult = registerBufferCommands(context) || {};
  const bufferRouter = bufferCommandResult.bufferRouter || {
    createBuffer: async () => null,
    deleteBuffer: async () => false,
    switchBuffer: async () => false,
    getCurrentBuffer: async () => null,
    cleanLayout: async () => false
  };
  
  // Initialize the window manager and register window manager commands
  // Add null check to prevent errors in tests
  const windowManagerResult = registerWindowManagerCommands(context) || {};
  const windowManager = windowManagerResult.windowManager || {
    cleanLayout: async () => false,
    registerCommands: () => {}
  };
  
  try {
    // Force-load the Lua module to ensure commands are registered
    const nvim = workspace.nvim;
    console.log('[COC-VUE] Loading vue-ui Lua module...');
    
    // Ensure the Lua module is loaded and commands are registered
    await nvim.command('lua print("[VUE-UI] Loading module from TypeScript activation")');
    
    // Rechargement forcé des modules Lua au cas où ils auraient été mal initialisés
    await nvim.command('lua if package.loaded["vue-ui"] then package.loaded["vue-ui"] = nil end');
    await nvim.command('lua if package.loaded["buffer_router"] then package.loaded["buffer_router"] = nil end');
    await nvim.command('lua if package.loaded["vue-ui.init"] then package.loaded["vue-ui.init"] = nil end');
    await nvim.command('lua if package.loaded["vue-ui.utils.window_manager"] then package.loaded["vue-ui.utils.window_manager"] = nil end');
    await nvim.command('lua if package.loaded["vue-ui.core.bridge"] then package.loaded["vue-ui.core.bridge"] = nil end');
    
    // Chargement explicite de tous les modules Lua nécessaires
    await nvim.command('lua require("vue-ui")');
    await nvim.command('lua require("buffer_router")');
    await nvim.command('lua require("vue-ui.init")');
    
    // Chargement explicite des modules de gestion de fenêtres
    await nvim.command('lua require("vue-ui.utils.window_manager")');
    await nvim.command('lua require("vue-ui.core.bridge")');
    
    // Initialisation forcée du gestionnaire de fenêtres
    await nvim.command('lua local window_manager = require("vue-ui.utils.window_manager"); window_manager.reset_layout_state(); print("[VUE-UI] Window manager reset and initialized")');
    
    // Vérification du chargement des modules essentiels
    await nvim.command('lua print("[VUE-UI] Module vue-ui loaded: " .. tostring(package.loaded["vue-ui"] ~= nil))');
    await nvim.command('lua print("[VUE-UI] Module window_manager loaded: " .. tostring(package.loaded["vue-ui.utils.window_manager"] ~= nil))');
    await nvim.command('lua print("[VUE-UI] Module bridge loaded: " .. tostring(package.loaded["vue-ui.core.bridge"] ~= nil))');
    
    // Log available commands for debugging
    console.log('[COC-VUE] Checking available Neovim commands...');
    await nvim.command('lua print("[VUE-UI] VueUISelect command registered: " .. tostring(vim.api.nvim_get_commands({})[\'VueUISelect\'] ~= nil))');
    
    console.log('[COC-VUE] Lua module loaded successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[COC-VUE] Error loading Lua module:', errorMessage);
    window.showErrorMessage(`Error loading Lua module: ${errorMessage}`);
  }
  
  // Register buffer router commands
  context.subscriptions.push(
    commands.registerCommand('vue.buffer.create', async (path: string, query?: Record<string, any>) => {
      return await bufferRouter.createBuffer(path, query);
    }),
    commands.registerCommand('vue.buffer.delete', async (id: string) => {
      return await bufferRouter.deleteBuffer(id);
    }),
    commands.registerCommand('vue.buffer.switch', async (identifier: string) => {
      return await bufferRouter.switchBuffer(identifier);
    }),
    commands.registerCommand('vue.buffer.current', async () => {
      return await bufferRouter.getCurrentBuffer();
    })
  );

  // Register bridge message receiver command
  context.subscriptions.push(
    commands.registerCommand('vue.bridge.receiveMessage', async (serializedMessage: string) => {
      try {
        await bridgeCore.receiveMessage(serializedMessage);
      } catch (error) {
        console.error('[COC-VUE] Error processing bridge message:', error);
      }
    })
  );
  
  // Register vueui.callMethod action to handle events from Lua
  context.subscriptions.push(
    commands.registerCommand('vueui.callMethod', async (eventName: string, data: any) => {
      try {
        console.log(`[COC-VUE] Received Lua event: ${eventName}`, data);
        
        // Handle different event types
        switch (eventName) {
          case 'component:created':
            // Handle component creation events
            window.showInformationMessage(`Component created: ${data?.id || 'unknown'}`);
            break;
          
          case 'select:opened':
            // Handle select opened events
            console.log(`[COC-VUE] Select opened: ${data?.id || 'unknown'}`);
            break;
          
          case 'select:changed':
            // Handle select changed events
            console.log(`[COC-VUE] Select value changed: ${data?.value || 'unknown'}`);
            break;
          
          case 'select:confirmed':
            // Handle select confirmed events
            console.log(`[COC-VUE] Select confirmed with value: ${data?.value || 'unknown'}`);
            window.showInformationMessage(`Selected value: ${data?.value || 'none'}`);
            break;
          
          default:
            console.log(`[COC-VUE] Unhandled event type: ${eventName}`);
        }
        
        return { success: true, eventName, timestamp: Date.now() };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[COC-VUE] Error handling Lua event ${eventName}:`, errorMessage);
        return { success: false, error: errorMessage, timestamp: Date.now() };
      }
    })
  );
  
  // Register bridge test command
  context.subscriptions.push(
    commands.registerCommand('vue.bridge.test', async () => {
      try {
        console.log('[COC-VUE] Testing generic bridge...');
        window.showInformationMessage('Testing generic bridge communication...');
        
        // Create a test message
        const testMessage: BridgeMessage = {
          id: 'test_component_' + Date.now(),
          type: MessageType.REQUEST,
          action: 'ping',
          payload: {
            message: 'Hello from TypeScript!',
            timestamp: Date.now()
          }
        };
        
        // Register a one-time handler for the response
        const responseHandler = async (message: BridgeMessage) => {
          if (message.type === MessageType.RESPONSE && message.action === 'pong') {
            window.showInformationMessage(`Bridge test successful! Response: ${JSON.stringify(message.payload)}`);
            bridgeCore.unregisterHandler('pong', responseHandler);
          }
        };
        
        bridgeCore.registerHandler('pong', responseHandler);
        
        // Send the test message
        console.log('[COC-VUE] Sending test message:', testMessage);
        const result = await bridgeCore.sendMessage(testMessage);
        console.log('[COC-VUE] Initial result:', result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[COC-VUE] Error testing bridge:', errorMessage);
        window.showErrorMessage(`Error testing bridge: ${errorMessage}`);
      }
    })
  );
  
  // Register the vue.selectDemo command
  context.subscriptions.push(
    commands.registerCommand('vue.selectDemo', async () => {
      try {
        console.log('[COC-VUE] Executing vue.selectDemo command');
        const nvim = workspace.nvim;
        
        // Ensure the Lua module is loaded before executing the command
        await nvim.command('lua if not package.loaded["vue-ui"] then require("vue-ui") end');
  await nvim.command('lua if not package.loaded["buffer_router"] then require("buffer_router") end');
        
        // Create a unique ID for the Select component
        const selectId = 'select_demo_' + Date.now();
        const selectTitle = 'Select Component Demo';
        
        // Configure demo options for the Select component
        const selectOptions = {
          multi: false,
          width: 40,
          placeholder: 'Choose an option...',
          options: [
            { id: 'option1', text: 'Option 1', value: 'value1' },
            { id: 'option2', text: 'Option 2', value: 'value2' },
            { id: 'option3', text: 'Option 3', value: 'value3' },
            { id: 'option4', text: 'Option 4', value: 'value4' },
            { id: 'option5', text: 'Option 5', value: 'value5' }
          ]
        };
        
        // Convert options to JSON for the Lua command
        const optionsJson = JSON.stringify(selectOptions);
        
        console.log(`[COC-VUE] Preparing to launch Select component with ID: ${selectId}`);
        
        // Verify the command is registered before executing it
        await nvim.command('lua print("[VUE-UI] Checking VueUISelect command before execution: " .. tostring(vim.api.nvim_get_commands({})[\'VueUISelect\'] ~= nil))');
        
        // Execute the VueUISelect command to create and open the Select component
        const command = `VueUISelect ${selectId} "${selectTitle}" ${optionsJson}`;
        console.log(`[COC-VUE] Executing Neovim command: ${command}`);
        
        await nvim.command(command);
        
        console.log('[COC-VUE] Select component launched successfully');
        window.showInformationMessage('Select component launched successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[COC-VUE] Error launching Select component:', errorMessage);
        window.showErrorMessage(`Error launching Select component: ${errorMessage}`);
      }
    })
  );
  
  // Register the vue.showComponentsDemo command (newly added)
  context.subscriptions.push(
    commands.registerCommand('vue.showComponentsDemo', async () => {
      try {
        console.log('[COC-VUE] Executing vue.showComponentsDemo command');
        const nvim = workspace.nvim;
        
        // Ensure the Lua module is loaded before executing the command
        await nvim.command('lua if not package.loaded["vue-ui"] then require("vue-ui") end');
  await nvim.command('lua if not package.loaded["buffer_router"] then require("buffer_router") end');
        
        // Create a demo with multiple components
        window.showInformationMessage('Launching Components Demo...');
        
        // Select component demo
        const selectId = 'select_components_demo_' + Date.now();
        const selectTitle = 'Select Component';
        const selectOptions = {
          multi: false,
          width: 40,
          placeholder: 'Select a component...',
          options: [
            { id: 'select', text: 'Select', value: 'select' },
            { id: 'input', text: 'Input', value: 'input' },
            { id: 'button', text: 'Button', value: 'button' },
            { id: 'modal', text: 'Modal', value: 'modal' }
          ]
        };
        
        // Convert options to JSON for the Lua command
        const optionsJson = JSON.stringify(selectOptions);
        
        // Execute the VueUISelect command to create and open the Select component
        const command = `VueUISelect ${selectId} "${selectTitle}" ${optionsJson}`;
        await nvim.command(command);
        
        console.log('[COC-VUE] Components demo launched successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[COC-VUE] Error launching Components demo:', errorMessage);
        window.showErrorMessage(`Error launching Components demo: ${errorMessage}`);
      }
    })
  );
  
  // Register the vue.showWindowDemo command (redirects to windowManager.demoLayout)
  context.subscriptions.push(
    commands.registerCommand('vue.showWindowDemo', async () => {
      try {
        console.log('[COC-VUE] Executing vue.showWindowDemo command');
        
        // Execute the windowManager.demoLayout command
        window.showInformationMessage('Launching Window Manager Demo Layout...');
        await commands.executeCommand('windowManager.demoLayout');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[COC-VUE] Error launching Window demo:', errorMessage);
        window.showErrorMessage(`Error launching Window demo: ${errorMessage}`);
      }
    })
  );
  
  // Register the vue.showEditorDemo command (newly added)
  context.subscriptions.push(
    commands.registerCommand('vue.showEditorDemo', async () => {
      try {
        console.log('[COC-VUE] Executing vue.showEditorDemo command');
        
        // Display a simple information message for now
        window.showInformationMessage('Editor Demo is not fully implemented yet');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[COC-VUE] Error launching Editor demo:', errorMessage);
        window.showErrorMessage(`Error launching Editor demo: ${errorMessage}`);
      }
    })
  );
  
  // Register command to display buffer states
  context.subscriptions.push(
    commands.registerCommand('vue.showBufferStatus', async () => {
      try {
        console.log('[COC-VUE] Checking template buffer status');
        
        // Get buffer state from WindowManager
        const bufferState = await windowManager.getBufferState();
        
        // Format buffer state for display
        const statusLines = [];
        statusLines.push('=== COC-VUE TEMPLATE BUFFER STATUS ===');
        
        for (const [slot, info] of Object.entries(bufferState)) {
          const validityStatus = info.valid ? 'VALID' : 'INVALID';
          const statusLine = `${slot}: Buffer ${info.bufferId} - ${validityStatus} - ${info.name}`;
          statusLines.push(statusLine);
          
          // Log to console for debugging
          console.log(`[COC-VUE] ${statusLine}`);
        }
        
        statusLines.push('===================================');
        
        // Display the status in a floating window
        const nvim = workspace.nvim;
        const currWin = await nvim.call('nvim_get_current_win');
        const width = 80;
        const height = statusLines.length;
        
        // Create status buffer
        const buf = await nvim.call('nvim_create_buf', [false, true]);
        await nvim.call('nvim_buf_set_lines', [buf, 0, -1, false, statusLines]);
        await nvim.call('nvim_buf_set_option', [buf, 'modifiable', false]);
        await nvim.call('nvim_buf_set_option', [buf, 'buftype', 'nofile']);
        await nvim.call('nvim_buf_set_option', [buf, 'bufhidden', 'wipe']);
        
        // Calculate position for centered floating window
        const editorWidth = await nvim.call('nvim_get_option', ['columns']);
        const editorHeight = await nvim.call('nvim_get_option', ['lines']);
        const col = Math.floor((editorWidth - width) / 2);
        const row = Math.floor((editorHeight - height) / 2);
        
        // Create floating window
        const floatOpts = {
          relative: 'editor',
          width,
          height,
          row,
          col,
          style: 'minimal',
          border: 'rounded',
          title: 'Template Buffer Status',
          title_pos: 'center'
        };
        
        await nvim.call('nvim_open_win', [buf, true, floatOpts]);
        
        // Close on any key press
        await nvim.command('nnoremap <buffer> <silent> <Esc> :close<CR>');
        await nvim.command('nnoremap <buffer> <silent> q :close<CR>');
        await nvim.command('nnoremap <buffer> <silent> <CR> :close<CR>');
        
        // Set highlight and options
        await nvim.command('setlocal cursorline');
        await nvim.command('setlocal syntax=markdown');
        
        window.showInformationMessage('Buffer status displayed in floating window');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[COC-VUE] Error displaying buffer status:', errorMessage);
        window.showErrorMessage(`Error displaying buffer status: ${errorMessage}`);
      }
    })
  );
  
  // Register template status command
  context.subscriptions.push(
    commands.registerCommand('vue.showTemplateStatus', async () => {
      try {
        const status = await workspace.nvim.call('exists', 'g:coc_vue_template_status');
        window.showInformationMessage(`Template status: ${status ? 'Active' : 'Inactive'}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        window.showErrorMessage(`Error getting template status: ${errorMessage}`);
      }
    })
  );
  
  // Register template layout mounting command
  context.subscriptions.push(
    commands.registerCommand('vue.mountTemplateLayout', async () => {
      try {
        // Close any existing windows/buffers to ensure clean mounting
        if (windowManager?.cleanLayout) {
          await windowManager.cleanLayout();
        }
        
        // Render the app template
        const success = await renderAppTemplate(
          windowManager || { cleanLayout: async () => false },
          bufferRouter || { createBuffer: async () => null }
        );
        
        if (success) {
          console.log('[COC-VUE] Template layout mounted successfully');
          window.showInformationMessage('Template layout mounted successfully.');
        } else {
          console.warn('[COC-VUE] Template layout mounted with warnings');
          window.showWarningMessage('Template layout mounted with warnings. Check logs for details.');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        window.showErrorMessage(`Error mounting template layout: ${errorMessage}`);
      }
    })
  );
  
  // Get configuration for auto-bootstrap - safely handle test environment
  let autoBootstrap = false;
  try {
    const config = workspace.getConfiguration('vue');
    if (config && typeof config.get === 'function') {
      autoBootstrap = config.get<boolean>('template.autoBootstrap', false);
      console.log(`[COC-VUE] Configuration read: vue.template.autoBootstrap = ${autoBootstrap}`);
    } else {
      console.log('[COC-VUE] Configuration not available (test environment)');
    }
  } catch (error) {
    console.warn('[COC-VUE] Could not access configuration, using defaults:', error);
  }

  // Ne pas initialiser directement le CocBridge ici, cela perturbe le flux d'initialisation
  console.log('[COC-VUE] Continuing with normal extension activation...');

  if (autoBootstrap) {
    console.log(`[COC-VUE] autoBootstrap is true. Attempting to load template...`);
    
    // Nettoyer tout layout existant avant le bootstrap
    console.log(`[COC-VUE] Cleaning existing layout before auto-bootstrap...`);
    await windowManager.cleanLayout();
    
    console.log(`[COC-VUE] Layout cleaned. Starting App component rendering via renderAppTemplate...`);
    
    try {
      // Rendre l'App template
      const success = await renderAppTemplate(windowManager, bufferRouter);
      
      if (success === true) {
        console.log(`[COC-VUE] Template layout auto-mount completed successfully.`);
        window.showInformationMessage('Template layout auto-mounted on startup.');
      } else {
        // Si renderAppTemplate renvoie false, c'est un avertissement (test spécifique)
        console.warn(`[COC-VUE] Template layout auto-mount completed with warnings.`);
        window.showWarningMessage('Template layout auto-mounted with warnings. Check logs for details.');
      }
    } catch (error) {
      // Gestion d'erreur explicite pour le test
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[COC-VUE] Template layout auto-mount failed with error: ${errorMessage}`);
      window.showErrorMessage(`Error auto-mounting template layout: ${errorMessage}`);
    }
  } else {
    console.log('[COC-VUE] autoBootstrap is false. Skipping template auto-loading.');
  }

  console.log('[COC-VUE] Vue-like reactive bridge activated successfully');
}

// Cleanup function called when the extension is deactivated
export function deactivate(): void {
  console.log('[COC-VUE] Deactivating Vue-like reactive bridge');
  
  if (componentRegistry) {
    for (const [id, component] of componentRegistry.entries()) {
      try {
        if (component && component.destroy && typeof component.destroy === 'function') {
          component.destroy();
          console.log(`[COC-VUE] Component ${id} destroyed`);
        }
      } catch (error) {
        console.error(`[COC-VUE] Error destroying component ${id}:`, error);
      }
    }
    componentRegistry.clear();
  }
}
